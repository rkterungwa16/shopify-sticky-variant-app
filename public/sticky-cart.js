/**
 * Sticky Variant Bar - vanilla JS, no build step, no dependencies.
 *
 * Runs on Shopify product pages. Reads the current product's JSON
 * (Shopify serves this for free at {product-url}.js), builds a fixed
 * bottom bar with a variant picker + Add to cart button, and shows it
 * once the page's own "buy box" scrolls out of view.
 *
 * Talks to Shopify's storefront Ajax Cart API (/cart/add.js) directly -
 * no backend round trip needed for the actual add-to-cart action.
 */
(function () {
  "use strict";

  var config = window.__STICKY_VARIANT_CONFIG__ || {
    enabled: true,
    backgroundColor: "#111111",
    textColor: "#ffffff",
    accentColor: "#2e6cf6",
    buttonLabel: "Add to cart",
    showOnScrollPastPx: 400,
  };

  if (!config.enabled) return;

  ready(init);

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function init() {
    var productHandle = getProductHandleFromUrl();
    if (!productHandle) return; // not a product page

    fetchProductJson(productHandle)
      .then(function (product) {
        if (!product || !product.variants || !product.variants.length) return;
        var bar = buildBar(product, config);
        document.body.appendChild(bar.el);
        watchScrollPosition(bar);
      })
      .catch(function (err) {
        console.error("[sticky-variant-bar]", err);
      });
  }

  function getProductHandleFromUrl() {
    var match = window.location.pathname.match(/\/products\/([a-zA-Z0-9\-_%]+)/);
    return match ? match[1] : null;
  }

  function fetchProductJson(handle) {
    return fetch("/products/" + handle + ".js", { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) throw new Error("Could not load product JSON (" + res.status + ")");
      return res.json();
    });
  }

  function formatMoney(cents, currency) {
    var amount = (cents / 100).toFixed(2);
    return (currency ? currency + " " : "$") + amount;
  }

  function buildBar(product, cfg) {
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || "";

    var el = document.createElement("div");
    el.className = "svb-bar";
    el.style.setProperty("--svb-bg", cfg.backgroundColor);
    el.style.setProperty("--svb-fg", cfg.textColor);
    el.style.setProperty("--svb-accent", cfg.accentColor);
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Quick add to cart");

    var image = product.featured_image || (product.images && product.images[0]) || "";

    el.innerHTML =
      '<div class="svb-inner">' +
        (image ? '<img class="svb-thumb" src="' + image + '" alt="" />' : "") +
        '<div class="svb-info">' +
          '<div class="svb-title">' + escapeHtml(product.title) + "</div>" +
          '<div class="svb-price" data-svb="price">' + formatMoney(product.variants[0].price, currency) + "</div>" +
        "</div>" +
        '<label class="svb-visually-hidden" for="svb-variant-select">Variant</label>' +
        '<select class="svb-select" id="svb-variant-select" data-svb="variant-select"></select>' +
        '<div class="svb-qty">' +
          '<button type="button" data-svb="decrement" aria-label="Decrease quantity">&minus;</button>' +
          '<input type="number" min="1" value="1" data-svb="qty" aria-label="Quantity" />' +
          '<button type="button" data-svb="increment" aria-label="Increase quantity">+</button>' +
        "</div>" +
        '<button type="button" class="svb-add" data-svb="add">' + escapeHtml(cfg.buttonLabel) + "</button>" +
        '<span class="svb-feedback" data-svb="feedback" role="status" aria-live="polite"></span>' +
      "</div>";

    var select = el.querySelector('[data-svb="variant-select"]');
    product.variants.forEach(function (variant) {
      var opt = document.createElement("option");
      opt.value = variant.id;
      opt.textContent = variant.available
        ? variant.title + " - " + formatMoney(variant.price, currency)
        : variant.title + " (Sold out)";
      opt.disabled = !variant.available;
      select.appendChild(opt);
    });

    var priceEl = el.querySelector('[data-svb="price"]');
    var addBtn = el.querySelector('[data-svb="add"]');
    var qtyInput = el.querySelector('[data-svb="qty"]');
    var feedback = el.querySelector('[data-svb="feedback"]');

    function currentVariant() {
      var id = Number(select.value);
      return product.variants.find(function (v) { return v.id === id; });
    }

    function syncToVariant() {
      var variant = currentVariant();
      if (!variant) return;
      priceEl.textContent = formatMoney(variant.price, currency);
      addBtn.disabled = !variant.available;
      addBtn.textContent = variant.available ? cfg.buttonLabel : "Sold out";
    }

    select.addEventListener("change", syncToVariant);
    syncToVariant();

    el.querySelector('[data-svb="increment"]').addEventListener("click", function () {
      qtyInput.value = Math.max(1, parseInt(qtyInput.value || "1", 10) + 1);
    });
    el.querySelector('[data-svb="decrement"]').addEventListener("click", function () {
      qtyInput.value = Math.max(1, parseInt(qtyInput.value || "1", 10) - 1);
    });

    addBtn.addEventListener("click", function () {
      var variant = currentVariant();
      if (!variant || !variant.available) return;

      addBtn.disabled = true;
      var originalLabel = addBtn.textContent;
      addBtn.textContent = "Adding...";

      addToCart(variant.id, parseInt(qtyInput.value || "1", 10))
        .then(function () {
          feedback.textContent = "Added to cart";
          bumpCartCountIfPresent();
          setTimeout(function () { feedback.textContent = ""; }, 2500);
        })
        .catch(function (err) {
          feedback.textContent = "Couldn't add to cart";
          console.error("[sticky-variant-bar]", err);
        })
        .finally(function () {
          addBtn.disabled = false;
          addBtn.textContent = originalLabel;
        });
    });

    return { el: el, root: el };
  }

  function addToCart(variantId, quantity) {
    return fetch("/cart/add.js", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: variantId, quantity: quantity }),
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (data) { throw new Error(data.description || "Add to cart failed"); });
      return res.json();
    });
  }

  function bumpCartCountIfPresent() {
    // Best-effort: many themes expose a cart count bubble with one of
    // these common selectors. If found, refresh it from /cart.js.
    var selectors = ["[data-cart-count]", ".cart-count", "#CartCount"];
    var target = selectors.map(function (s) { return document.querySelector(s); }).find(Boolean);
    if (!target) return;
    fetch("/cart.js")
      .then(function (r) { return r.json(); })
      .then(function (cart) { target.textContent = cart.item_count; })
      .catch(function () {});
  }

  function watchScrollPosition(bar) {
    var trigger =
      document.querySelector("form[action*='/cart/add']") ||
      document.querySelector(".product-form") ||
      document.querySelector("[data-product-form]");

    function show() { bar.el.classList.add("svb-visible"); }
    function hide() { bar.el.classList.remove("svb-visible"); }

    if (trigger && "IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) hide();
            else show();
          });
        },
        { rootMargin: "0px 0px -20% 0px" }
      );
      observer.observe(trigger);
    } else {
      // Fallback: simple scroll-position threshold.
      window.addEventListener(
        "scroll",
        throttle(function () {
          if (window.scrollY > (config.showOnScrollPastPx || 400)) show();
          else hide();
        }, 150)
      );
    }
  }

  function throttle(fn, wait) {
    var last = 0;
    return function () {
      var now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn();
      }
    };
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
