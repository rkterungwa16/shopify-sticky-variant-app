# Sticky Variant Bar — Shopify App (Node.js SSR, vanilla JS)

A minimal Shopify app that adds a sticky "quick add to cart" bar to product
pages: pick a variant, adjust quantity, add to cart — the bar stays fixed at
the bottom of the screen once the shopper scrolls past the main buy box.

No frontend framework, no build step. The admin dashboard is server-rendered
HTML (plain Node/Express + template-literal "views"), and the storefront
widget is a single vanilla JS file injected via a Shopify ScriptTag.

## How it fits together

```
Merchant installs app
        │
        ▼
  OAuth (src/routes/auth.js) ── Admin API: exchange code for access token
        │
        ▼
  Register a ScriptTag (src/shopifyApi.js) that points at /widget/loader.js
        │
        ▼
  Every storefront page loads /widget/loader.js (src/routes/widget.js)
        │              which injects config + loads:
        ▼
  public/sticky-cart.js  ── fetches /products/{handle}.js (Shopify's public
                             product JSON) and Shopify's Ajax Cart API
                             (/cart/add.js) directly from the browser
```

- **`server.js`** — Express app, wires up routes, serves `/static/*`.
- **`src/shopifyAuth.js`** — OAuth URL building, HMAC verification, token exchange.
- **`src/shopifyApi.js`** — thin Admin REST API wrapper (products, script tags).
- **`src/store.js`** — in-memory store for access tokens + per-shop widget
  settings. Swap for a real database before going to production.
- **`src/routes/auth.js`** — `/auth` and `/auth/callback` (the OAuth dance).
- **`src/routes/dashboard.js`** — `/dashboard`, a server-rendered settings
  page + product list.
- **`src/routes/widget.js`** — `/widget/loader.js`, the public endpoint the
  ScriptTag calls; returns small JS that loads the real widget assets.
- **`public/sticky-cart.js` / `public/sticky-cart.css`** — the actual sticky
  bar shown on the storefront.

## Setup

1. **Create a Partner app**
   In the [Shopify Partners dashboard](https://partners.shopify.com), create
   an app and note the **Client ID** and **Client secret**.

2. **Expose your local server**
   Shopify requires a public HTTPS URL for OAuth redirects. In development,
   use a tunnel:
   ```
   ngrok http 3000
   ```
   Copy the `https://...ngrok-free.app` URL.

3. **Configure app URLs in the Partners dashboard**
   - App URL: `https://<your-tunnel>.ngrok-free.app/`
   - Allowed redirection URL(s): `https://<your-tunnel>.ngrok-free.app/auth/callback`

4. **Environment variables**
   ```
   cp .env.example .env
   ```
   Fill in `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, and set `HOST` to your
   tunnel URL (no trailing slash). Generate a random string for
   `SESSION_SECRET`.

5. **Install & run**
   ```
   npm install
   npm start
   ```

6. **Install on a dev store**
   Visit:
   ```
   https://<your-tunnel>.ngrok-free.app/?shop=your-dev-store.myshopify.com
   ```
   Click **Install on this store**, approve the requested scopes
   (`read_products`, `write_script_tags`), and you'll land on `/dashboard`.
   The app registers a ScriptTag automatically during that callback, so the
   sticky bar starts appearing on the storefront right away.

7. **See it live**
   Visit any product page on the dev store, scroll down past the buy box,
   and the sticky bar should slide up from the bottom.

## Customizing

Use the dashboard (`/dashboard?shop=...`) to change the button label and the
bar's background/text/accent colors — saved settings apply the next time
`/widget/loader.js` is requested (i.e. on the next storefront page load).

## Notes on scope

This is a *basic* reference implementation, intentionally light on
production concerns:

- **Storage is in-memory** (`src/store.js`). Restarting the server forgets
  every shop's access token and settings — replace with Postgres/SQLite/Redis
  for real use.
- **No webhook handlers** (e.g. `app/uninstalled`, GDPR webhooks), which a
  published Shopify app is required to implement.
- **No embedded Admin (App Bridge) UI** — the dashboard is a plain page
  rather than embedded inside Shopify's admin, to keep the SSR/vanilla-JS
  brief. Wiring it into App Bridge/Polaris is a natural next step.
- **Theme App Extensions** are Shopify's current recommended way to inject
  storefront UI (ScriptTags are the older, simpler mechanism); this app uses
  ScriptTags because they're the most direct way to demonstrate the
  Admin-API-driven install flow without a Shopify CLI extension project.
