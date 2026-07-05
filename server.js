// server.js
// Entry point. Plain Express, server-rendered HTML (no React/templating
// engine), static assets served directly, and a few JSON/OAuth routes
// that talk to the Shopify Admin API.

require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieSession = require("cookie-session");

const authRoutes = require("./src/routes/auth");
const dashboardRoutes = require("./src/routes/dashboard");
const widgetRoutes = require("./src/routes/widget");
const { page } = require("./src/views/layout");

const required = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SCOPES",
  "HOST",
  "SESSION_SECRET",
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(
    `Warning: missing env vars: ${missing.join(", ")}. Copy .env.example to .env and fill it in.`,
  );
}

const app = express();

app.use(
  cookieSession({
    name: "svb_session",
    secret: process.env.SESSION_SECRET || "dev-only-secret-change-me",
    maxAge: 24 * 60 * 60 * 1000,
  }),
);

// Static assets referenced by the widget loader (CSS + the sticky bar JS).
app.use(
  "/static",
  express.static(path.join(__dirname, "public"), { maxAge: "5m" }),
);

app.use(widgetRoutes);
app.use(authRoutes);
app.use(dashboardRoutes);

app.get("/", (req, res) => {
  const shop = req.query.shop;
  const body = shop
    ? `<div class="card">
        <h2>Install Sticky Variant Bar</h2>
        <p>Connect this app to <strong>${shop}</strong> to add a sticky add-to-cart bar to your product pages.</p>
        <a href="/?shop=${encodeURIComponent(shop)}"><button>Install on this store</button></a>
      </div>`
    : `<div class="card">
        <h2>Sticky Variant Bar</h2>
        <p>Enter your store's <code>.myshopify.com</code> domain to install:</p>
        <form method="GET" action="/">
          <input type="text" name="shop" placeholder="karenkombolateliers.myshopify.com" />
          <button type="submit" style="margin-top:10px;">Continue</button>
        </form>
      </div>`;
  res.send(page({ title: "Sticky Variant Bar", body }));
});

app.use((req, res) => {
  res.status(404).send("Not found");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Sticky Variant Bar app listening on http://localhost:${port}`);
});
