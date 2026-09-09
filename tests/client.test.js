const { test, describe } = require('node:test');
const assert = require('node:assert');
const { ToyhouseOAuth, DEFAULT_ENDPOINTS } = require('../dist');

describe('ToyhouseOAuth (Vanilla Client)', () => {
    test('debe fallar si faltan parámetros obligatorios en el constructor', () => {
        assert.throws(() => new ToyhouseOAuth({}), /are required/);
        assert.throws(() => new ToyhouseOAuth({ clientId: 'id' }), /are required/);
        assert.throws(() => new ToyhouseOAuth({ clientId: 'id', clientSecret: 'sec' }), /are required/);
    });

    test('debe inicializarse correctamente con nombres canónicos y alias', () => {
        const client1 = new ToyhouseOAuth({
            clientId: 'test-id',
            clientSecret: 'test-sec',
            redirectUri: 'http://localhost:3000/callback'
        });
        assert.strictEqual(client1.clientId, 'test-id');
        assert.strictEqual(client1.clientSecret, 'test-sec');
        assert.strictEqual(client1.redirectUri, 'http://localhost:3000/callback');
        assert.strictEqual(client1.authorizationURL, DEFAULT_ENDPOINTS.authorizationURL);

        const client2 = new ToyhouseOAuth({
            clientID: 'alt-id',
            clientSecret: 'alt-sec',
            callbackURL: 'http://localhost:3000/alt-cb'
        });
        assert.strictEqual(client2.clientId, 'alt-id');
        assert.strictEqual(client2.redirectUri, 'http://localhost:3000/alt-cb');
    });

    test('getAuthorizationUrl genera la URL correcta con parámetros por defecto', () => {
        const client = new ToyhouseOAuth({
            clientId: 'app123',
            clientSecret: 'secret',
            redirectUri: 'https://example.com/callback'
        });

        const url = new URL(client.getAuthorizationUrl());
        assert.strictEqual(url.origin + url.pathname, DEFAULT_ENDPOINTS.authorizationURL);
        assert.strictEqual(url.searchParams.get('client_id'), 'app123');
        assert.strictEqual(url.searchParams.get('redirect_uri'), 'https://example.com/callback');
        assert.strictEqual(url.searchParams.get('response_type'), 'code');
    });

    test('getAuthorizationUrl soporta state en string y objeto con scope', () => {
        const client = new ToyhouseOAuth({
            clientId: 'app123',
            clientSecret: 'secret',
            redirectUri: 'https://example.com/callback'
        });

        const urlState = new URL(client.getAuthorizationUrl('random_csrf_state'));
        assert.strictEqual(urlState.searchParams.get('state'), 'random_csrf_state');

        const urlObj = new URL(client.getAuthorizationUrl({
            state: 'state_123',
            scope: ['email']
        }));
        assert.strictEqual(urlObj.searchParams.get('state'), 'state_123');
        assert.strictEqual(urlObj.searchParams.get('scope'), 'email');
    });

    test('getAccessToken intercambia código por tokens exitosamente', async () => {
        const mockFetch = async (url, options) => {
            assert.strictEqual(url, DEFAULT_ENDPOINTS.tokenURL);
            assert.strictEqual(options.method, 'POST');
            const body = new URLSearchParams(options.body);
            assert.strictEqual(body.get('grant_type'), 'authorization_code');
            assert.strictEqual(body.get('code'), 'valid_code_123');
            assert.strictEqual(body.get('client_id'), 'app123');

            return {
                ok: true,
                status: 200,
                json: async () => ({
                    access_token: 'fake_access_token',
                    token_type: 'Bearer',
                    expires_in: 3600
                })
            };
        };

        const client = new ToyhouseOAuth({
            clientId: 'app123',
            clientSecret: 'secret',
            redirectUri: 'https://example.com/callback',
            fetch: mockFetch
        });

        const tokens = await client.getAccessToken('valid_code_123');
        assert.strictEqual(tokens.access_token, 'fake_access_token');
        assert.strictEqual(tokens.token_type, 'Bearer');
        assert.strictEqual(tokens.expires_in, 3600);
    });

    test('getAccessToken arroja error informativo ante falla HTTP', async () => {
        const mockFetch = async () => ({
            ok: false,
            status: 400,
            text: async () => JSON.stringify({ error_description: 'Código de autorización expirado' })
        });

        const client = new ToyhouseOAuth({
            clientId: 'app123',
            clientSecret: 'secret',
            redirectUri: 'https://example.com/callback',
            fetch: mockFetch
        });

        await assert.rejects(
            () => client.getAccessToken('expired_code'),
            /Código de autorización expirado/
        );
    });

    test('getUserProfile obtiene datos del usuario autenticado', async () => {
        const mockFetch = async (url, options) => {
            assert.strictEqual(url, DEFAULT_ENDPOINTS.userProfileURL);
            assert.strictEqual(options.headers['Authorization'], 'Bearer fake_token_abc');

            return {
                ok: true,
                status: 200,
                json: async () => ({
                    id: 4242,
                    username: 'ToyhouseArtist',
                    name: 'ToyhouseArtist',
                    avatar: 'https://toyhou.se/avatars/4242.png'
                })
            };
        };

        const client = new ToyhouseOAuth({
            clientId: 'app123',
            clientSecret: 'secret',
            redirectUri: 'https://example.com/callback',
            fetch: mockFetch
        });

        const profile = await client.getUserProfile('fake_token_abc');
        assert.strictEqual(profile.id, 4242);
        assert.strictEqual(profile.username, 'ToyhouseArtist');
        assert.strictEqual(profile.avatar, 'https://toyhou.se/avatars/4242.png');
    });

    test('refreshToken renueva el token correctamente', async () => {
        const mockFetch = async (url, options) => {
            const body = new URLSearchParams(options.body);
            assert.strictEqual(body.get('grant_type'), 'refresh_token');
            assert.strictEqual(body.get('refresh_token'), 'refresh_xyz');

            return {
                ok: true,
                status: 200,
                json: async () => ({
                    access_token: 'new_access_token',
                    token_type: 'Bearer'
                })
            };
        };

        const client = new ToyhouseOAuth({
            clientId: 'app123',
            clientSecret: 'secret',
            redirectUri: 'https://example.com/callback',
            fetch: mockFetch
        });

        const res = await client.refreshToken('refresh_xyz');
        assert.strictEqual(res.access_token, 'new_access_token');
    });
});
