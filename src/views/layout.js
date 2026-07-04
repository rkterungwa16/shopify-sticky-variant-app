// src/views/layout.js
// Server-rendered HTML shell. Deliberately no templating engine -
// plain functions returning template literals is enough for a small
// admin surface, and it keeps the whole app dependency-light.

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function page({ title, body, shop }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --ink: #1a1a1a;
      --paper: #fafaf9;
      --line: #e4e2dd;
      --accent: #2e6cf6;
      --muted: #706c66;
      --radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
    }
    .topbar {
      padding: 20px 32px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .topbar h1 { font-size: 16px; margin: 0; font-weight: 600; }
    .topbar .shop { color: var(--muted); font-size: 13px; }
    main { max-width: 880px; margin: 0 auto; padding: 32px; }
    .card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 20px;
    }
    .card h2 { margin-top: 0; font-size: 15px; }
    label { display: block; font-size: 13px; color: var(--muted); margin: 14px 0 6px; }
    input[type="text"], input[type="number"] {
      width: 100%; padding: 9px 10px; border: 1px solid var(--line);
      border-radius: 8px; font-size: 14px;
    }
    input[type="color"] { width: 48px; height: 32px; border: none; padding: 0; background: none; }
    .row { display: flex; gap: 20px; flex-wrap: wrap; }
    .row > div { flex: 1; min-width: 160px; }
    button {
      background: var(--ink); color: #fff; border: none;
      padding: 10px 18px; border-radius: 8px; font-size: 14px;
      cursor: pointer;
    }
    button.secondary { background: #fff; color: var(--ink); border: 1px solid var(--line); }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); }
    th { color: var(--muted); font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
    .status.on { background: #e6f4ea; color: #1e7e34; }
    .status.off { background: #f4e6e6; color: #b3261e; }
    .banner { background: #eef3ff; border: 1px solid #cddcfb; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; }
    img.thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid var(--line); }
  </style>
</head>
<body>
  <div class="topbar">
    <h1>Sticky Variant Bar</h1>
    ${shop ? `<span class="shop">${escapeHtml(shop)}</span>` : ""}
  </div>
  <main>${body}</main>
</body>
</html>`;
}

module.exports = { page, escapeHtml };
