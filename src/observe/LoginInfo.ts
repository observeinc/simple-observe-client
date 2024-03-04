// The information needed for an Observe login, and the
// result from that request.
class LoginInfo {
    // customer is your customerId -- for example, 137646103412 -- as a string
    customer: string = '';
    // site is the base domain of your Observe tenant / region. For example:
    // observeinc.com
    // eu-1.observeinc.com
    site: string = '';
    // email is the email address of the user trying to log in, as captured
    // on the Observe side. (If you use a SAML or OAuth integration, this is
    // under control of the remote IdP, not Observe itself.)
    email: string = '';
    // token is the authorization bearer token returned, if successfully logged in.
    token: string = '';
    // user is information about the currently logged in user, if logged in.
    user: {
        id: string;
        name: string;
    } = {
            id: '',
            name: '',
        };

    // what URL should I use as base for API calls?
    public getUrl(path: string): string {
        return `https://${this.customer}.${this.site}${path}`;
    }
    // urlDetermined is true if enough information is filled in to attempt
    // to make login requests.
    public urlDetermined(): boolean {
        return this.site !== '' && this.customer != '' && this.email !== '';
    }
    // tokenDetermined is true if we have enough information to make query
    // requests (e g, URL + authorization token.)
    public tokenDetermined(): boolean {
        return this.urlDetermined() && this.token !== '';
    }
    // userDetermined is true if we have actually used the credentials to
    // make a successful request
    public userDetermined(): boolean {
        return this.tokenDetermined() && this.user.id !== '';
    }
};

// The application only logs in one user at a time, so keep it as a convenient
// global variable.
export default LoginInfo;
