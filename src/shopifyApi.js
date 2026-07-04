// src/shopifyApi.js
// Small wrapper around the Admin REST API. Only the handful of
// endpoints this app needs: products, and script tags.

const API_VERSION = "2024-10";

function adminUrl(shop, path) {
  return `https://${shop}/admin/api/${API_VERSION}/${path}`;
}

async function shopifyRequest(shop, accessToken, path, options = {}) {
  const response = await fetch(adminUrl(shop, path), {
    ...options,
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Shopify API ${path} failed: ${response.status} ${body}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

/** List products (first page, 250 max) with the fields the dashboard needs. */
async function listProducts(shop, accessToken) {
  const fields = "id,title,handle,images,variants,status";
  const data = await shopifyRequest(
    shop,
    accessToken,
    `products.json?limit=50&fields=${encodeURIComponent(fields)}`,
  );
  return data.products;
}

/** Register (or re-use) the ScriptTag that injects the sticky bar on the storefront. */
async function ensureStickyBarScriptTag(shop, accessToken) {
  const scriptUrl = `${process.env.HOST}/widget/loader.js?shop=${encodeURIComponent(shop)}`;

  const existing = await shopifyRequest(shop, accessToken, "script_tags.json");
  const already = existing.script_tags.find((tag) =>
    tag.src.startsWith(`${process.env.HOST}/widget/loader.js`),
  );
  if (already) return already;

  const created = await shopifyRequest(shop, accessToken, "script_tags.json", {
    method: "POST",
    body: JSON.stringify({
      script_tag: {
        event: "onload",
        src: scriptUrl,
        display_scope: "online_store",
      },
    }),
  });
  return created.script_tag;
}

async function removeScriptTag(shop, accessToken, scriptTagId) {
  await shopifyRequest(shop, accessToken, `script_tags/${scriptTagId}.json`, {
    method: "DELETE",
  });
}

module.exports = {
  listProducts,
  ensureStickyBarScriptTag,
  removeScriptTag,
};
