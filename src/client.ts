import { DEFAULT_ENDPOINTS } from './constants';
import type {
    ToyhouseOAuthOptions,
    AuthorizationUrlOptions,
    ToyhouseTokenResponse,
    ToyhouseUserProfile
} from './types';

export class ToyhouseOAuth {
    public readonly clientId: string;
    public readonly clientSecret: string;
    public readonly redirectUri: string;
    public readonly authorizationURL: string;
    public readonly tokenURL: string;
    public readonly userProfileURL: string;

    // Alias
    public readonly authUrl: string;
    public readonly tokenUrl: string;
    public readonly apiUrl: string;

    private readonly fetchFn: typeof fetch;

    /**
     * Vanilla ToyHou.se Client
     */
    constructor(options: ToyhouseOAuthOptions = {} as ToyhouseOAuthOptions) {
        const clientId = options.clientId || options.clientID;
        const clientSecret = options.clientSecret;
        const redirectUri = options.redirectUri || options.callbackURL;

        if (!clientId || !clientSecret || !redirectUri) {
            throw new Error("clientId, clientSecret y redirectUri are required");
        }

        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;

        this.authorizationURL = options.authorizationURL || options.authUrl || DEFAULT_ENDPOINTS.authorizationURL;
        this.tokenURL = options.tokenURL || options.tokenUrl || DEFAULT_ENDPOINTS.tokenURL;
        this.userProfileURL = options.userProfileURL || options.apiUrl || DEFAULT_ENDPOINTS.userProfileURL;

        this.authUrl = this.authorizationURL;
        this.tokenUrl = this.tokenURL;
        this.apiUrl = this.userProfileURL;

        this.fetchFn = options.fetch || globalThis.fetch;
        if (typeof this.fetchFn !== 'function') {
            throw new Error("fetch is required (Try installing fetch for node or use a polyfill for older environments");
        }
    }

    /**
     * Generate the URL for user authorization
     */
    public getAuthorizationUrl(params: AuthorizationUrlOptions | string = {}): string {
        let state = '';
        let scope = '';

        if (typeof params === 'string') {
            state = params;
        } else if (params && typeof params === 'object') {
            if (params.state) state = params.state;
            if (params.scope) {
                scope = Array.isArray(params.scope) ? params.scope.join(' ') : params.scope;
            }
        }

        const urlParams = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code'
        });

        if (state) {
            urlParams.set('state', state);
        }

        if (scope) {
            urlParams.set('scope', scope);
        }

        return `${this.authorizationURL}?${urlParams.toString()}`;
    }

    /**
     * Swap the authorization code for an access token
     */
    public async getAccessToken(code: string): Promise<ToyhouseTokenResponse> {
        if (!code || typeof code !== 'string') {
            throw new Error("Authorization code is required");
        }

        const bodyParams = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.redirectUri,
            code: code.trim()
        });

        const response = await this.fetchFn(this.tokenURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: bodyParams.toString()
        });

        if (!response.ok) {
            const errorDetails = await this._parseErrorResponse(response);
            throw new Error(`Error al obtener el token de Toyhou.se (HTTP ${response.status}): ${errorDetails}`);
        }

        return (await response.json()) as ToyhouseTokenResponse;
    }

    /**
     * Refresh the access token
     */
    public async refreshToken(refreshToken: string): Promise<ToyhouseTokenResponse> {
        if (!refreshToken || typeof refreshToken !== 'string') {
            throw new Error("Refresh token is required");
        }

        const bodyParams = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: refreshToken.trim()
        });

        const response = await this.fetchFn(this.tokenURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'User-Agent': 'toyhouse-oauth'
            },
            body: bodyParams.toString()
        });

        if (!response.ok) {
            const errorDetails = await this._parseErrorResponse(response);
            throw new Error(`Error refreshing token: ${errorDetails}`);
        }

        return (await response.json()) as ToyhouseTokenResponse;
    }

    /**
     * Get authenticated user profile
     */
    public async getUserProfile(accessToken: string): Promise<ToyhouseUserProfile> {
        if (!accessToken || typeof accessToken !== 'string') {
            throw new Error("Access token is required");
        }

        const response = await this.fetchFn(this.userProfileURL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken.trim()}`,
                'Accept': 'application/json',
                'User-Agent': 'toyhouse-oauth'
            }
        });

        if (!response.ok) {
            const errorDetails = await this._parseErrorResponse(response);
            throw new Error(`Error getting user profile: ${errorDetails}`);
        }

        return (await response.json()) as ToyhouseUserProfile;
    }

    private async _parseErrorResponse(response: Response): Promise<string> {
        try {
            const text = await response.text();
            try {
                const json = JSON.parse(text);
                return json.error_description || json.error || json.message || text;
            } catch {
                return text || response.statusText || 'Unknown error';
            }
        } catch {
            return response.statusText || 'Unknown error';
        }
    }
}
