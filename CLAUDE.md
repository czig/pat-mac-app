# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn serve        # Dev server with hot-reload
yarn build        # Production build (outputs to /dist)
yarn test:unit    # Run unit tests
yarn test:unit --grep "test name"  # Run a single test
yarn deploy       # Sync /dist to S3 (requires AWS profile 'caleb')
```

Firebase hosting is also configured (`firebase.json`), but primary deploy is via the S3 script.

## Architecture

**Pat Mac's Copper Works** is a Vue 2 SPA portfolio site for a copper artist, built with Vue CLI and hosted on Firebase / S3 at patmacscopperworks.com.

**Stack:**
- Vue 2 + Vue Router 3 + Vuex
- Vuetify 2 (Material Design, dark theme `grey darken-4`)
- AWS Cognito (`amazon-cognito-identity-js`) for authentication
- Axios for HTTP

**Key files:**
- `src/main.js` — app entry, registers Vue plugins
- `src/App.vue` — root layout: top app bar + responsive nav drawer
- `src/router/index.js` — all routes (`/`, `/about`, `/gallery`, `/blog`, `/contact`)
- `src/stores/main.js` — Vuex store root, registers namespaced `auth` module
- `src/stores/auth.js` — auth state (user, loading, error), actions call `src/auth/cognito.js`
- `src/auth/cognito.js` — wraps `amazon-cognito-identity-js`; Cognito UserPoolId and ClientId are placeholder values that must be configured

**Authentication status (in-progress):**
- `src/components/login.vue` exists but has no route yet
- Login redirects to `/dashboard` which also has no route
- Cognito config values in `src/auth/cognito.js` are placeholders — set via `.env` before use
