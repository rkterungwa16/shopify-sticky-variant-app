// src/routes/dashboard.js
// Server-rendered admin dashboard embedded (in a real app) as an
// Admin section. Shows install status, product list, and lets the
// merchant tweak the sticky bar's colors/label.

const express = require("express");
const { getShop, getSettings, saveSettings } = require("../store");
const { listProducts } = require("../shopifyApi");
const { page, escapeHtml } = require("../views/layout");

const router = express.Router();

function requireShop(req, res, next) {
  const shop = req.query.shop || req.session.shop;
  if (!shop) return res.status(400).send("Missing ?shop= parameter.");
  const record = getShop(shop);
  if (!record || !record.accessToken) {
    return res.redirect(`/auth?shop=${encodeURIComponent(shop)}`);
  }
  req.shop = shop;
  req.shopRecord = record;
  next();
}

router.get("/dashboard", requireShop, async (req, res) => {
  const { shop, shopRecord } = req;
  const settings = getSettings(shop);

  let products = [];
  let error = null;
  try {
    products = await listProducts(shop, shopRecord.accessToken);
  } catch (err) {
    error = err.message;
  }

  const rows = products
    .slice(0, 10)
    .map((p) => {
      const image = p.images && p.images[0] ? p.images[0].src : "";
      const variantCount = p.variants ? p.variants.length : 0;
      return `<tr>
        <td>${image ? `<img class="thumb" src="${escapeHtml(image)}" alt="" />` : ""}</td>
        <td>${escapeHtml(p.title)}</td>
        <td>${variantCount} variant${variantCount === 1 ? "" : "s"}</td>
        <td><span class="status ${p.status === "active" ? "on" : "off"}">${escapeHtml(p.status)}</span></td>
      </tr>`;
    })
    .join("");

  const body = `
    <div class="banner">Sticky bar script is installed on <strong>${escapeHtml(shop)}</strong> and will appear on product pages automatically.</div>

    <div class="card">
      <h2>Appearance</h2>
      <form method="POST" action="/dashboard/settings?shop=${encodeURIComponent(shop)}">
        <div class="row">
          <div>
            <label for="buttonLabel">Button label</label>
            <input type="text" id="buttonLabel" name="buttonLabel" value="${escapeHtml(settings.buttonLabel)}" />
          </div>
          <div>
            <label for="backgroundColor">Bar background</label>
            <input type="color" id="backgroundColor" name="backgroundColor" value="${escapeHtml(settings.backgroundColor)}" />
          </div>
          <div>
            <label for="textColor">Bar text</label>
            <input type="color" id="textColor" name="textColor" value="${escapeHtml(settings.textColor)}" />
          </div>
          <div>
            <label for="accentColor">Button accent</label>
            <input type="color" id="accentColor" name="accentColor" value="${escapeHtml(settings.accentColor)}" />
          </div>
        </div>
        <label style="margin-top:18px;">
          <input type="checkbox" name="enabled" ${settings.enabled ? "checked" : ""} style="width:auto;display:inline-block;" />
          Sticky bar enabled
        </label>
        <div style="margin-top:18px;">
          <button type="submit">Save changes</button>
        </div>
      </form>
    </div>

    <div class="card">
      <h2>Products</h2>
      ${error ? `<p style="color:#b3261e;">Couldn't load products: ${escapeHtml(error)}</p>` : ""}
      ${products.length
        ? `<table>
            <thead><tr><th></th><th>Title</th><th>Variants</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`
        : "<p>No products found yet.</p>"}
    </div>
  `;

  res.send(page({ title: "Sticky Variant Bar - Dashboard", body, shop }));
});

router.post("/dashboard/settings", requireShop, express.urlencoded({ extended: true }), (req, res) => {
  const { shop } = req;
  const { buttonLabel, backgroundColor, textColor, accentColor, enabled } = req.body;

  saveSettings(shop, {
    buttonLabel: buttonLabel || "Add to cart",
    backgroundColor: backgroundColor || "#111111",
    textColor: textColor || "#ffffff",
    accentColor: accentColor || "#2e6cf6",
    enabled: enabled === "on",
  });

  res.redirect(`/dashboard?shop=${encodeURIComponent(shop)}`);
});

module.exports = router;
