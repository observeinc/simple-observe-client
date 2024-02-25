import { Accessor, Setter, Signal, createSignal } from 'solid-js';
import LoginInfo from './LoginInfo';
import { query } from './gql';


export type LoginEnum = 'unconfigured' | 'loading' | 'loggedIn';

export class LoginState {
    public info: Signal<LoginInfo> = createSignal(new LoginInfo());
    public error: Accessor<string>;
    setError: Setter<string>;
    state: Signal<LoginEnum>;
    randomToken?: string;
    delegatedToken?: string;

    constructor() {
        this.state = createSignal<LoginEnum>('unconfigured');
        [this.error, this.setError] = createSignal<string>('');
        // re-use the random token, because we don't want to spam too many requests
        this.randomToken = this.makeRandomToken();
    }

    setInfo(state: Partial<LoginInfo>) {
        console.log('setInfo', state);
        this.info[1]((i: LoginInfo) => Object.assign(i, state));
    }

    public getInfo(): LoginInfo {
        return this.info[0]();
    }

    setState(state: LoginEnum, error: string) {
        console.log('state:', state, error);
        this.setError(error);
        const [_, s] = this.state;
        s(state);
    }

    public getState(): string {
        return this.state[0]();
    }

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
                /* TODO: replace this with a REST user endpoing.
                 */
                const rslt = await query(info, 'query { currentUser { id name:label } }');
                console.log('rslt', rslt);
                if (rslt.data?.currentUser) {
                    this.setInfo({ user: rslt.data.currentUser });
                    this.setState('loggedIn', '');
                    return;
                }
            }
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
        /* TODO: document the Oauth device-style endpoints/flow.
         */
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
            })
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

    makeRandomToken(): string {
        if (crypto && crypto.getRandomValues) {
            return [...crypto.getRandomValues(new Uint32Array(5))].map(v => v.toString(36)).join('');
        }
        console.log('no crypto.getRandomValues available');
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    async pollDelegatedLogin() {
        try {
            const info = this.getInfo();
            /* TODO: document the poll endpoint for delegated login.
             */
            const u = info.getUrl(`/v1/login/delegated/${this.delegatedToken}`);
            const rslt = await fetch(u);
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
