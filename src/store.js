// src/store.js
// Very small in-memory "database" so the app has somewhere to keep
// per-shop access tokens and widget settings. Swap this module out
// for Postgres/SQLite/Redis in a real deployment - everything else
// in the app only talks to the functions below, not to storage directly.

const shops = new Map();

function defaultSettings() {
  return {
    enabled: true,
    backgroundColor: "#111111",
    textColor: "#ffffff",
    accentColor: "#2e6cf6",
    buttonLabel: "Add to cart",
    showOnScrollPastPx: 400, // fallback if IntersectionObserver isn't available
  };
}

function getShop(shop) {
  return shops.get(shop) || null;
}

function saveShop(shop, data) {
  const current = shops.get(shop) || { settings: defaultSettings() };
  shops.set(shop, { ...current, ...data });
  return shops.get(shop);
}

function getSettings(shop) {
  const record = shops.get(shop);
  return (record && record.settings) || defaultSettings();
}

function saveSettings(shop, settings) {
  const record = shops.get(shop) || {};
  const merged = { ...defaultSettings(), ...record.settings, ...settings };
  shops.set(shop, { ...record, settings: merged });
  return merged;
}

module.exports = {
  getShop,
  saveShop,
  getSettings,
  saveSettings,
  defaultSettings,
};
