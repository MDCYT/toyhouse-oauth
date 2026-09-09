require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { ToyhouseOAuth, ToyhouseStrategy } = require('../dist');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const IS_MOCK = process.env.MOCK_TOYHOUSE === 'true' || !process.env.TOYHOUSE_CLIENT_ID;

const CLIENT_ID = process.env.TOYHOUSE_CLIENT_ID || 'hey_its_me';
const CLIENT_SECRET = process.env.TOYHOUSE_CLIENT_SECRET || 'its_verity';

const ENDPOINTS = IS_MOCK ? {
    authorizationURL: `${BASE_URL}/mock/~oauth/authorize`,
    tokenURL: `${BASE_URL}/mock/~oauth/token`,
    userProfileURL: `${BASE_URL}/mock/~api/v1/me`
} : {
    authorizationURL: 'https://toyhou.se/~oauth/authorize',
    tokenURL: 'https://toyhou.se/~oauth/token',
    userProfileURL: 'https://toyhou.se/~api/v1/me'
};

const vanillaClient = new ToyhouseOAuth({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: `${BASE_URL}/auth/vanilla/callback`,
    ...ENDPOINTS
});

passport.use(new ToyhouseStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: `${BASE_URL}/auth/passport/callback`,
    ...ENDPOINTS
}, (accessToken, refreshToken, profile, done) => {
    return done(null, { profile, accessToken, method: 'Passport.js' });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'super-secreto-toyhouse-demo',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

if (IS_MOCK) {
    app.get('/mock/~oauth/authorize', (req, res) => {
        const { client_id, redirect_uri, state } = req.query;
        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Mock Toyhou.se</title>
            </head>
            <body>
                <h2>Autorize App</h2></br>
                <p>This application uses Toyhou.se OAuth to authenticate users and retrieve their profile information. It uses the ToyhouseOAuth and ToyhouseStrategy classes from the toyhou.se-oauth library.</p></br>
                <strong>Please autorize to continue</strong></br>
                <a href="${redirect_uri}?code=mock_auth_code_${Date.now()}&state=${state || ''}">Authorize</a></br>
                <a href="${redirect_uri}?error=access_denied&state=${state || ''}">Deny</a></br></br>
                <p>If you dont want to autorize, you can close this tab.</p></br>
            </body>
            </html>
        `);
    });

    app.post('/mock/~oauth/token', (req, res) => {
        const { grant_type, code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'invalid_grant', error_description: 'missing code' });
        }
        res.json({
            access_token: `mock_tok_${Date.now()}`,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: `mock_ref_${Date.now()}`
        });
    });

    app.get('/mock/~api/v1/me', (req, res) => {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'unauthorized', error_description: 'missing token' });
        }
        res.json({
            id: 88421,
            username: 'MDC',
            name: 'MDCDEV',
            avatar: 'https://f2.toyhou.se/file/f2-toyhou-se/users/MDC?1',
            email: 'mdc@domain.invalid'
        });
    });
}

app.get('/', (req, res) => {
    const user = req.session.user || (req.user && req.user.profile);
    if (user) {
        return res.redirect('/profile');
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Toyhouse OAuth</title>
        </head>
        <body>
            <h1>Toyhouse OAuth</h1>
            <p>This application uses Toyhou.se OAuth to authenticate users and retrieve their profile information. It uses the ToyhouseOAuth and ToyhouseStrategy classes from the toyhou.se-oauth library.</p>
            <a href="/auth/vanilla">Vanilla</a>
            <a href="/auth/passport">Passport</a>
        </body>
        </html>
    `);
});

app.get('/auth/vanilla', (req, res) => {
    const state = `vanilla_${Math.random().toString(36).substring(2, 10)}`;
    req.session.oauthState = state;
    const authUrl = vanillaClient.getAuthorizationUrl({ state, scope: 'email' });
    res.redirect(authUrl);
});

app.get('/auth/vanilla/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.status(400).send(`Toyhou.se Error: ${error}`);
    }

    try {
        const tokens = await vanillaClient.getAccessToken(code);
        const profile = await vanillaClient.getUserProfile(tokens.access_token);

        req.session.user = {
            method: 'Vanilla',
            profile,
            tokens
        };

        res.redirect('/profile');
    } catch (err) {
        res.status(500).send(`Vanilla Error: ${err.message}`);
    }
});

app.get('/auth/passport', passport.authenticate('toyhouse', { scope: ['email'] }));

app.get('/auth/passport/callback',
    passport.authenticate('toyhouse', { failureRedirect: '/?error=passport_failed' }),
    (req, res) => {
        res.redirect('/profile');
    }
);

app.get('/profile', (req, res) => {
    let userData = null;
    let method = '';
    let tokens = null;

    if (req.session.user) {
        userData = req.session.user.profile;
        method = req.session.user.method;
        tokens = req.session.user.tokens;
    } else if (req.user) {
        userData = req.user.profile;
        method = req.user.method;
        tokens = { access_token: req.user.accessToken };
    }

    if (!userData) {
        return res.redirect('/');
    }

    const avatarUrl = userData.avatar || 'https://f2.toyhou.se/file/f2-toyhou-se/characters/39864248?1781426524';
    const username = userData.username || userData.name || 'User';
    const userId = userData.id || 'N/A';

    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Profile - Toyhouse OAuth Demo</title>
        </head>
        <body>
            <h1>Profile</h1>
            <p>Method: ${method}</p>
            <p>Username: ${username}</p>
            <p>ID: ${userId}</p>
            <img src="${avatarUrl}" alt="${username}">
            <pre>${JSON.stringify(userData, null, 2)}</pre>
            ${tokens ? `<pre>${JSON.stringify(tokens, null, 2)}</pre>` : ''}
            <a href="/logout">Logout</a>
        </body>
        </html>
    `);
});

app.get('/logout', (req, res, next) => {
    req.session.destroy(() => {
        if (req.logout) {
            req.logout(() => res.redirect('/'));
        } else {
            res.redirect('/');
        }
    });
});

app.listen(PORT, () => {
    console.log(`\n Demo Server: ${BASE_URL}`);
    console.log(` Mode: ${IS_MOCK ? 'Mock Active' : 'Toyhou.se Production'}`);
});
