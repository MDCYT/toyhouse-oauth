import OAuth2Strategy, { InternalOAuthError } from 'passport-oauth2';
import { DEFAULT_ENDPOINTS } from './constants';
import type {
    ToyhouseStrategyOptions,
    ToyhousePassportProfile,
    VerifyFunction
} from './types';

export class ToyhouseStrategy extends OAuth2Strategy {
    public override name: string;
    public _userProfileURL: string;
    private readonly fetchFn: typeof fetch;

    /**
     * Passport.js strategy for Toyhou.se
     */
    constructor(options: ToyhouseStrategyOptions, verify: VerifyFunction) {
        const opts = { ...options };

        opts.authorizationURL = (opts.authorizationURL as string) || (opts.authUrl as string) || DEFAULT_ENDPOINTS.authorizationURL;
        opts.tokenURL = (opts.tokenURL as string) || (opts.tokenUrl as string) || DEFAULT_ENDPOINTS.tokenURL;
        opts.clientID = (opts.clientID as string) || (opts.clientId as string);
        opts.callbackURL = (opts.callbackURL as string) || (opts.redirectUri as string);

        super(opts as any, verify as any);

        this.name = 'toyhouse';
        this._userProfileURL = (opts.userProfileURL as string) || (opts.apiUrl as string) || DEFAULT_ENDPOINTS.userProfileURL;

        // Force Authorization header Bearer for consistency
        if (this._oauth2) {
            this._oauth2.useAuthorizationHeaderforGET(true);
            this._oauth2.setAuthMethod('Bearer');
        }

        this.fetchFn = (opts.fetch as typeof fetch) || globalThis.fetch;
        if (typeof this.fetchFn !== 'function') {
            throw new Error("fetch is required (Try installing fetch for node or use a polyfill for older environments)");
        }
    }

    /**
     * Get user profile from Toyhou.se using the received accessToken
     * Uses fetch with Bearer headers and JSON to match Vanilla client behavior
     */
    public override async userProfile(
        accessToken: string,
        done: (err?: Error | null, profile?: ToyhousePassportProfile) => void
    ): Promise<void> {
        try {
            const response = await this.fetchFn(this._userProfileURL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken.trim()}`,
                    'Accept': 'application/json',
                    'User-Agent': 'toyhouse-oauth'
                }
            });

            const body = await response.text();

            if (!response.ok) {
                return done(new InternalOAuthError(`Failed to get user profile from Toyhou.se (HTTP ${response.status})`, new Error(body)));
            }

            let json: Record<string, unknown>;
            try {
                json = JSON.parse(body);
            } catch (parseError: any) {
                return done(new Error('Invalid JSON response from Toyhou.se: ' + parseError.message));
            }

            if (!json || typeof json !== 'object') {
                return done(new Error('Unexpected response from Toyhou.se'));
            }

            const profile: ToyhousePassportProfile = {
                provider: 'toyhouse',
                id: json.id !== undefined ? String(json.id) : undefined,
                username: (json.username as string) || (json.name as string) || undefined,
                displayName: (json.name as string) || (json.username as string) || undefined,
                avatar: (json.avatar as string) || (json.avatar_url as string) || undefined,
                email: (json.email as string) || undefined,
                _raw: body,
                _json: json
            };

            return done(null, profile);
        } catch (err: any) {
            return done(new InternalOAuthError('Failed to get user profile from Toyhou.se', err));
        }
    }
}
