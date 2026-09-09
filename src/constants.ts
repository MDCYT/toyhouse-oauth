import type { DefaultEndpoints } from './types';

export const DEFAULT_ENDPOINTS: DefaultEndpoints = Object.freeze({
    authorizationURL: 'https://toyhou.se/~oauth/authorize',
    tokenURL: 'https://toyhou.se/~oauth/token',
    userProfileURL: 'https://toyhou.se/~api/v1/me'
});
