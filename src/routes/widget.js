// src/routes/widget.js
// Public, unauthenticated endpoint. This is what Shopify's ScriptTag
// points at, so it runs on every storefront page for the shop that
// installed the app. It's small on purpose: inject config as a global,
// then load the real widget JS/CSS as static assets so they're cached.

const express = require("express");
const { getSettings } = require("../store");

const router = express.Router();

router.get("/widget/loader.js", (req, res) => {
  const shop = req.query.shop;
  const settings = shop ? getSettings(shop) : require("../store").defaultSettings();

  res.type("application/javascript");
  res.send(`(function () {
  if (!${settings.enabled}) return;
  window.__STICKY_VARIANT_CONFIG__ = ${JSON.stringify(settings)};

  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "${process.env.HOST}/static/sticky-cart.css";
  document.head.appendChild(css);

  var script = document.createElement("script");
  script.src = "${process.env.HOST}/static/sticky-cart.js";
  script.defer = true;
  document.head.appendChild(script);
})();`);
});

module.exports = router;
