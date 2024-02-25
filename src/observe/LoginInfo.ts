class LoginInfo {
    customer: string = '';
    site: string = '';
    email: string = '';
    token: string = '';
    user: {
        id: string;
        name: string;
    } = {
            id: '',
            name: '',
        };

    public getUrl(path: string): string {
        return `https://${this.customer}.${this.site}${path}`;
    }
    public urlDetermined(): boolean {
        return this.site !== '' && this.customer != '' && this.email !== '';
    }
    public tokenDetermined(): boolean {
        return this.urlDetermined() && this.token !== '';
    }
    public userDetermined(): boolean {
        return this.tokenDetermined() && this.user.id !== '';
    }
};

export default LoginInfo;
