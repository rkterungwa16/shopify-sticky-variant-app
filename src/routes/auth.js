// src/routes/auth.js
// The two endpoints that make up Shopify's OAuth dance:
//   GET /auth           -> redirect merchant to Shopify's consent screen
//   GET /auth/callback   -> exchange the code for a token, store it, register the widget

const express = require("express");
const {
  isValidShopDomain,
  buildInstallUrl,
  verifyHmac,
  exchangeCodeForToken,
  generateNonce,
} = require("../shopifyAuth");
const { saveShop } = require("../store");
const { ensureStickyBarScriptTag } = require("../shopifyApi");

const router = express.Router();

router.get("/auth", (req, res) => {
  const { shop } = req.query;
  if (!isValidShopDomain(shop)) {
    return res.status(400).send("Missing or invalid ?shop= parameter, e.g. ?shop=my-store.myshopify.com");
  }

  const state = generateNonce();
  req.session.oauthState = state;
  req.session.shop = shop;

  res.redirect(buildInstallUrl(shop, state));
});

router.get("/auth/callback", async (req, res) => {
  const { shop, code, state } = req.query;

  if (!isValidShopDomain(shop)) {
    return res.status(400).send("Invalid shop parameter.");
  }
  if (!verifyHmac(req.query)) {
    return res.status(401).send("HMAC validation failed - request may not be from Shopify.");
  }
  if (!state || state !== req.session.oauthState) {
    return res.status(401).send("State mismatch - possible CSRF attempt.");
  }

  try {
    const accessToken = await exchangeCodeForToken(shop, code);
    saveShop(shop, { accessToken });

    // Register the storefront ScriptTag so the sticky bar starts
    // showing up on the theme right after install.
    await ensureStickyBarScriptTag(shop, accessToken);

    req.session.shop = shop;
    res.redirect(`/dashboard?shop=${encodeURIComponent(shop)}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong finishing installation. Check server logs.");
  }
});

module.exports = router;
