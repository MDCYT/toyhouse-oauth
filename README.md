# toyhouse-oauth

[![npm version](https://img.shields.io/npm/v/toyhouse-oauth.svg?style=flat-square)](https://www.npmjs.com/package/toyhouse-oauth)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org)

ToyHou.se OAuth2 Library for Node.js

---

## Features

- **Dual Support**: If you use passport you can use `ToyhouseStrategy`, else you can make you own autentication flow using `ToyhouseOAuth` class.
- **TypeScript Support**: Full TypeScript support with type definitions.
- **Official Endpoints**: Configured with Toyhou.se official endpoints (`~oauth/authorize`, `~oauth/token`, `~api/v1/me`).
- **Flexible Aliases**: Accepts `clientId` / `clientID` and `redirectUri` / `callbackURL`.

---

## Installation

```bash
npm install toyhouse-oauth
```

> **Note**: If you plan to use Passport.js integration, make sure you have `passport` and `passport-oauth2` installed:
> ```bash
> npm install passport passport-oauth2
> ```

---

## Get Toyhou.se Credentials

1. Log in to [Toyhou.se](https://toyhou.se).
2. Go to developer section: **[https://toyhou.se/~developer/apps](https://toyhou.se/~developer/apps)**.
3. Create a new application and register your redirect URL (Callback URL), for example:
   - Development: `http://localhost:3000/auth/toyhouse/callback`
4. Copy your **Client ID** and **Client Secret**.

---

## Usage

### 1. With Passport.js (Express)

```javascript
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const { ToyhouseStrategy } = require('toyhouse-oauth');

const app = express();

app.use(session({ secret: 'tu_secreto', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new ToyhouseStrategy({
    clientID: process.env.TOYHOUSE_CLIENT_ID,
    clientSecret: process.env.TOYHOUSE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/toyhouse/callback'
}, (accessToken, refreshToken, profile, done) => {
    /*
      profile contains:
      {
        provider: 'toyhouse',
        id: '12345',
        username: 'Username',
        displayName: 'Username',
        avatar: 'https://...',
        email: '...',
        _raw: '...',
        _json: { ... }
      }
    */
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Login
app.get('/auth/toyhouse', passport.authenticate('toyhouse'));

// Callback
app.get('/auth/toyhouse/callback',
    passport.authenticate('toyhouse', { failureRedirect: '/login' }),
    (req, res) => {
        res.json({ message: 'Authenticated successfully!', user: req.user });
    }
);

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
```

---

### 2. Vanilla Client (No Passport)

Ideal for any framework (Express, Fastify, Next.js, Hono, or pure Node.js scripts):

```javascript
const { ToyhouseOAuth } = require('toyhouse-oauth');

const client = new ToyhouseOAuth({
    clientId: process.env.TOYHOUSE_CLIENT_ID,
    clientSecret: process.env.TOYHOUSE_CLIENT_SECRET,
    redirectUri: 'http://localhost:3000/callback'
});

// 1. Redirect the user
app.get('/login', (req, res) => {
    const authUrl = client.getAuthorizationUrl({
        state: 'csrf_random_token',
        scope: 'email' // optional
    });
    res.redirect(authUrl);
});

// 2. Receive the callback and exchange code
app.get('/callback', async (req, res) => {
    const { code } = req.query;

    try {
        // Exchange code for Access Token
        const tokens = await client.getAccessToken(code);
        // { access_token, token_type, expires_in, refresh_token }

        // Get the authenticated user's profile
        const profile = await client.getUserProfile(tokens.access_token);
        // { id, username, name, avatar, email }

        res.json({ tokens, profile });
    } catch (error) {
        res.status(500).send(`Error de autenticación: ${error.message}`);
    }
});
```

---

### 3. With TypeScript

```typescript
import { ToyhouseOAuth, ToyhouseStrategy, ToyhousePassportProfile } from 'toyhouse-oauth';

const client = new ToyhouseOAuth({
    clientId: 'hey_its_me_the_client_id',
    clientSecret: 'ask_my_client_secret',
    redirectUri: 'http://localhost:3000/callback'
});
```

---

## Demo Server and Local Testing

The repository includes an interactive server ready to test on your machine:

```bash
# 1. Test in simulator mode (Integrated mock, no real credentials required):
npm run demo:mock

# 2. Test with real credentials:
# Configure your .env file with TOYHOUSE_CLIENT_ID and TOYHOUSE_CLIENT_SECRET
npm run demo
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the interactive interface.

---

## Running Tests

The tests are executed with the native Node.js test runner (fast and without heavy dependencies):

```bash
npm test
```

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.