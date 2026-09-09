const { test, describe } = require('node:test');
const assert = require('node:assert');
const { ToyhouseStrategy, DEFAULT_ENDPOINTS } = require('../dist');

describe('ToyhouseStrategy (Passport.js)', () => {
    test('debe inicializarse con nombre "toyhouse" y endpoints por defecto', () => {
        const strategy = new ToyhouseStrategy({
            clientID: 'client_123',
            clientSecret: 'secret_123',
            callbackURL: 'http://localhost:3000/auth/toyhouse/callback'
        }, () => {});

        assert.strictEqual(strategy.name, 'toyhouse');
        assert.strictEqual(strategy._userProfileURL, DEFAULT_ENDPOINTS.userProfileURL);
    });

    test('debe aceptar aliases de configuración como clientId y redirectUri', () => {
        const strategy = new ToyhouseStrategy({
            clientId: 'client_abc',
            clientSecret: 'secret_abc',
            redirectUri: 'http://localhost:3000/callback'
        }, () => {});

        assert.strictEqual(strategy._oauth2._clientId, 'client_abc');
        assert.strictEqual(strategy._oauth2._clientSecret, 'secret_abc');
    });

    test('userProfile debe mapear correctamente los campos del usuario', (t, done) => {
        const fakeJsonProfile = {
            id: 12345,
            username: 'ArtistCat',
            name: 'ArtistCat',
            avatar: 'https://toyhou.se/avatars/12345.jpg',
            email: 'artist@example.com'
        };

        const mockFetch = async (url, options) => {
            assert.strictEqual(url, DEFAULT_ENDPOINTS.userProfileURL);
            assert.strictEqual(options.headers['Authorization'], 'Bearer valid_token');
            assert.strictEqual(options.headers['Accept'], 'application/json');
            return {
                ok: true,
                status: 200,
                text: async () => JSON.stringify(fakeJsonProfile)
            };
        };

        const strategy = new ToyhouseStrategy({
            clientID: 'id',
            clientSecret: 'sec',
            callbackURL: 'http://localhost/cb',
            fetch: mockFetch
        }, () => {});

        strategy.userProfile('valid_token', (err, profile) => {
            assert.ifError(err);
            assert.strictEqual(profile.provider, 'toyhouse');
            assert.strictEqual(profile.id, '12345');
            assert.strictEqual(profile.username, 'ArtistCat');
            assert.strictEqual(profile.displayName, 'ArtistCat');
            assert.strictEqual(profile.avatar, 'https://toyhou.se/avatars/12345.jpg');
            assert.strictEqual(profile.email, 'artist@example.com');
            assert.deepStrictEqual(profile._json, fakeJsonProfile);
            done();
        });
    });

    test('userProfile maneja errores del servidor OAuth2', (t, done) => {
        const mockFetch = async () => ({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error'
        });

        const strategy = new ToyhouseStrategy({
            clientID: 'id',
            clientSecret: 'sec',
            callbackURL: 'http://localhost/cb',
            fetch: mockFetch
        }, () => {});

        strategy.userProfile('bad_token', (err, profile) => {
            assert(err);
            assert.match(err.message, /Fallo al obtener el perfil de usuario de Toyhou\.se/);
            assert.strictEqual(profile, undefined);
            done();
        });
    });

    test('userProfile maneja respuesta JSON malformada', (t, done) => {
        const mockFetch = async () => ({
            ok: true,
            status: 200,
            text: async () => '<html>Error 502 Bad Gateway</html>'
        });

        const strategy = new ToyhouseStrategy({
            clientID: 'id',
            clientSecret: 'sec',
            callbackURL: 'http://localhost/cb',
            fetch: mockFetch
        }, () => {});

        strategy.userProfile('token', (err, profile) => {
            assert(err);
            assert.match(err.message, /no es un JSON/i);
            done();
        });
    });
});
