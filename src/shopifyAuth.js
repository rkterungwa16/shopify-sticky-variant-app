// src/shopifyAuth.js
// Minimal OAuth 2.0 helpers for a Shopify "public/custom" app.
// No SDK, just crypto + fetch, so the flow stays easy to follow.

const crypto = require("crypto");

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  SCOPES,
  HOST,
} = process.env;

/**
 * Basic shop domain validator. Shopify shop params always look like
 * "something.myshopify.com" - reject anything else to avoid open-redirects.
 */
function isValidShopDomain(shop) {
  return typeof shop === "string" && /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}

/**
 * Build the URL that kicks off Shopify's OAuth consent screen.
 */
function buildInstallUrl(shop, state) {
  const redirectUri = `${HOST}/auth/callback`;
  const params = new URLSearchParams({
    client_id: SHOPIFY_API_KEY,
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Verify the HMAC Shopify attaches to every request (install redirect,
 * OAuth callback, and proxy requests). Prevents spoofed requests.
 */
function verifyHmac(query) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${Array.isArray(rest[key]) ? rest[key].join(",") : rest[key]}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmac, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Exchange the temporary `code` from the OAuth callback for a
 * permanent Admin API access token.
 */
async function exchangeCodeForToken(shop, code) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token; // string
}

function generateNonce() {
  return crypto.randomBytes(16).toString("hex");
}

module.exports = {
  isValidShopDomain,
  buildInstallUrl,
  verifyHmac,
  exchangeCodeForToken,
  generateNonce,
};
