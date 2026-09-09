export interface DefaultEndpoints {
    readonly authorizationURL: string;
    readonly tokenURL: string;
    readonly userProfileURL: string;
}

export interface ToyhouseOAuthOptions {
    clientId?: string;
    clientID?: string;
    clientSecret: string;
    redirectUri?: string;
    callbackURL?: string;
    authorizationURL?: string;
    authUrl?: string;
    tokenURL?: string;
    tokenUrl?: string;
    userProfileURL?: string;
    apiUrl?: string;
    fetch?: typeof fetch;
}

export interface AuthorizationUrlOptions {
    state?: string;
    scope?: string | string[];
}

export interface ToyhouseTokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    [key: string]: unknown;
}

export interface ToyhouseUserProfile {
    id: string | number;
    username: string;
    name?: string;
    avatar?: string;
    avatar_url?: string;
    email?: string | null;
    [key: string]: unknown;
}

export interface ToyhousePassportProfile {
    provider: 'toyhouse';
    id?: string;
    username?: string;
    displayName?: string;
    avatar?: string;
    email?: string;
    _raw: string;
    _json: Record<string, unknown>;
}

export interface ToyhouseStrategyOptions {
    clientID?: string;
    clientId?: string;
    clientSecret: string;
    callbackURL?: string;
    redirectUri?: string;
    authorizationURL?: string;
    authUrl?: string;
    tokenURL?: string;
    tokenUrl?: string;
    userProfileURL?: string;
    apiUrl?: string;
    scope?: string | string[];
    state?: unknown;
    fetch?: typeof fetch;
    [key: string]: unknown;
}

export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: ToyhousePassportProfile,
    done: (error: unknown, user?: unknown, info?: unknown) => void
) => void;
