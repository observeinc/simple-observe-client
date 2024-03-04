import { Accessor, Setter, Signal, createSignal } from 'solid-js';
import LoginInfo from './LoginInfo';
import { query } from './gql';


// What state is the current login process in?
// The states are:
// * unconfigured -- one of cid, site, or email needs configuring
// * loading -- I'm currently trying to log in
// * loggedIn -- I actually have an access token and can make requests
export type LoginEnum = 'unconfigured' | 'loading' | 'loggedIn';

// LoginState stores the information we need to handle login (authentication)
// management for talking to Observe. All we really need is the Authorization
// header bearer token, but there's some additional state to make the oauth-
// style delegated authorization flow nice.
//
// Once acquired, the login info is stored in localStorage. The security model
// for that is similar to storing cookies on the local machine. If you want to
// remove the token, call logout() to do so, which will remove the token from
// the local machine. (It will still be valid server-side until it expires.)
//
// You will typically not create this directly, but instead call the exported
// function login() to configure and kick off the process. The bind your UI to
// the signals exposed.
export class LoginState {
    // info contains the actual data for the login -- cid, etc
    public info: Signal<LoginInfo> = createSignal(new LoginInfo());
    // error will be non-empty if we are not logged in and need to display an error
    public error: Accessor<string>;
    setError: Setter<string>;
    state: Signal<LoginEnum>;
    // randomToken and delegatedToken are used during the authorization redirect
    randomToken?: string;
    delegatedToken?: string;

    constructor() {
        this.state = createSignal<LoginEnum>('unconfigured');
        [this.error, this.setError] = createSignal<string>('');
        // re-use the random token, because we don't want to spam too many requests
        this.randomToken = this.makeRandomToken();
    }

    // Update my login info, signal to dependents.
    setInfo(state: Partial<LoginInfo>) {
        console.log('setInfo', state);
        this.info[1]((i: LoginInfo) => Object.assign(i, state));
    }

    public getInfo(): LoginInfo {
        return this.info[0]();
    }

    // Set the current logged in state, signal to dependents.
    setState(state: LoginEnum, error: string) {
        console.log('state:', state, error);
        this.setError(error);
        const [_, s] = this.state;
        s(state);
    }

    public getState(): string {
        return this.state[0]();
    }

    // unset the per-user login info, and signal to dependents
    public logout() {
        this.setInfo({ token: '', email: '' });
        this.setState('unconfigured', 'Logged Out');
        localStorage.setItem('loginInfo', JSON.stringify(this.getInfo()));
    }

    // After constructing the LoginState, you actually get it going by
    // calling bootstrap(). It will verify that the necessary fields are
    // filled in, and if not, return with an error. Else it will send the
    // user on the delegated login journey to approve the request on the
    // Observe side, and then poll for the completed token. Once logged
    // in, the login state updates and the UI can react and use the token
    // to make requests.
    public async bootstrap() {
        try {
            const info = this.getInfo();
            console.log('bootstrap', info);
            localStorage.setItem('loginInfo', JSON.stringify(info));
            if (!info.urlDetermined()) {
                this.setState('unconfigured', 'Login needed');
                return;
            }
            this.setState('loading', '');
            if (info.tokenDetermined()) {
                // Check that the credentials actually work.
                // TODO: replace this with a REST user endpoint, because GQL
                // isn't publicly documented and may change.
                const rslt = await query(info, 'query { currentUser { id name:label } }');
                console.log('rslt', rslt);
                if (rslt.data?.currentUser) {
                    this.setInfo({ user: rslt.data.currentUser });
                    this.setState('loggedIn', '');
                    return;
                }
            }
            // busted -- make sure we don't hang on to it so we'd confuse ourselves
            // into believing it might work.
            this.setInfo({ token: '' });
            localStorage.setItem('loginInfo', JSON.stringify(info));
            // ok, send the user on a delegated login journey
            await this.startDelegatedLogin();
            setTimeout(() => this.pollDelegatedLogin(), 1000);
        } catch (e) {
            console.log(e);
            this.setState('unconfigured', '' + e);
        }
    }

    async startDelegatedLogin() {
        const info = this.getInfo();
        console.log('random client token', this.randomToken);
        // Using the oauth device-style login flow, documented at
        // https://developer.observeinc.com/
        const rslt = await fetch(info.getUrl('/v1/login/delegated'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userEmail: info.email,
                clientToken: this.randomToken,
                /* Todo: stolen from the CLI tool -- allocate own integration for this example.
                 */
                integration: "observe-tool-abdaf0"
            }),
            credentials: 'include',
            referrerPolicy: 'origin'
        });
        const j = await rslt.json();
        console.log('startDelegatedLogin', j);
        if (j.url) {
            // let user go through j.data.url
            window.open(j.url, '_blank');
            this.delegatedToken = j.serverToken;
            return;
        }
        throw new Error(j.message);
    }

    // Generate a random token. This is used to separate multiple different
    // login attempts // and thus doesn't need to be STRONG random, just needs
    // to not collide with other parallel attempts from the same user.
    makeRandomToken(): string {
        const prefix = `Simple Observe Client ${(new Date()).toISOString().slice(0, 10)} `;
        if (crypto && crypto.getRandomValues) {
            return prefix + [...crypto.getRandomValues(new Uint32Array(5))].map(v => v.toString(36)).join('').slice(0,6);
        }
        console.log('no crypto.getRandomValues available');
        return prefix + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 8);
    }

    // Check whether there's a completion on a pending authorization request.
    // Completion comes in one of three flavors:
    // 1. User accepted
    // 2. User rejected
    // 3. Request timed out
    // "time out" means server-side determined "this request is now too old to
    // settle," because each poll will return sooner. There is a little bit of
    // long-polling on the server side, so it's safe to re-try this request if
    // it's still un-settled.
    async pollDelegatedLogin() {
        try {
            const info = this.getInfo();
            const u = info.getUrl(`/v1/login/delegated/${this.delegatedToken}`);
            const rslt = await fetch(u, {
                credentials: 'include',
                referrerPolicy: 'origin'
            });
            const j = await rslt.json();
            console.log(u, j);
            if (!j.settled) {
                setTimeout(() => this.pollDelegatedLogin(), 1000);
            } else if (!j.accessKey) {
                this.setState('unconfigured', j.message || "Login failed");
            } else {
                this.setInfo({ token: j.accessKey });
                this.bootstrap();
            }
        } catch (e) {
            this.setState('unconfigured', '' + e);
        }
    }
};

// You only need to call login() once; it sets up the login // state object
// with signals that let you verify credentials and (re-)attempt to log in.
export const login = () => {
    const info = new LoginState();
    const li = localStorage.getItem('loginInfo');
    console.log('loginInfo', li);
    let j = {};
    if (li) {
        try {
            j = JSON.parse(li);
            info.setInfo(j);
        } catch (e) {
            console.log(e);
        }
    }
    info.bootstrap();
    return info;
};
