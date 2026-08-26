#!/usr/bin/env node
/*
 * Pre-deploy guard for purchase tracking.
 *
 * Why this exists: on 2026-08-23 TALLBOY shipped with a new Stripe Payment
 * Link that was never added to the products map in checkout-tracking.js. The
 * click handler bailed out on unknown links, so no client_reference_id was
 * appended, so stripe-webhook.js could not join the payment to a GA4 visit.
 * Four paid orders went untracked and nothing anywhere reported an error.
 *
 * Every check below is a thing that has actually broken or would break the
 * same silent way. Run: npm run check:tracking
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TRACKER = path.join(ROOT, "components", "checkout-tracking.js");
const FOOTER = path.join(ROOT, "components", "footer.js");
const MEASUREMENT_ID = "G-Z9L20HJ4M0";

const errors = [];
const notes = [];

const tracker = fs.readFileSync(TRACKER, "utf8");

// 1. The map of known payment links.
const mapped = new Set(
  (tracker.match(/'([A-Za-z0-9]{16,})':\s*\{/g) || []).map((m) => m.split("'")[1])
);
if (mapped.size === 0) errors.push("checkout-tracking.js: could not parse any payment link ids out of the products map.");

// 2. Fail-open guarantee. An early return on an unmapped link is the exact
//    regression that cost the TALLBOY sales.
if (/if\s*\(\s*!\s*product\s*\)\s*return/.test(tracker)) {
  errors.push("checkout-tracking.js: found an early return on an unmapped product. The handler must fail OPEN and still append client_reference_id.");
}
if (!/searchParams\.set\(\s*['"]client_reference_id['"]/.test(tracker)) {
  errors.push("checkout-tracking.js: no client_reference_id is ever appended. Stripe purchases cannot reach GA4 without it.");
}

// 3. Every payment link used on the site must be mapped, and every page that
//    sells must load GA4 and the tracker.
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
const seenLinks = new Map();

for (const page of pages) {
  const html = fs.readFileSync(path.join(ROOT, page), "utf8");
  const ids = [...html.matchAll(/buy\.stripe\.com\/(?:test\/)?([A-Za-z0-9]+)/g)].map((m) => m[1]);
  if (ids.length === 0) continue;

  for (const id of new Set(ids)) {
    if (!seenLinks.has(id)) seenLinks.set(id, []);
    seenLinks.get(id).push(page);
  }
  if (!html.includes(MEASUREMENT_ID)) {
    errors.push(`${page}: has a Stripe buy link but no ${MEASUREMENT_ID} tag. Its traffic and conversions are invisible.`);
  }
  if (!html.includes("checkout-tracking")) {
    errors.push(`${page}: has a Stripe buy link but does not load checkout-tracking.js. Its sales cannot be attributed.`);
  }
}

for (const [id, usedOn] of seenLinks) {
  if (!mapped.has(id)) {
    errors.push(`Payment link ${id} (used on ${usedOn.join(", ")}) is missing from the products map in components/checkout-tracking.js. Revenue will still track, but begin_checkout will report it as "unmapped:${id}".`);
  }
}

// 4. Cache-busting version must be identical everywhere, or Netlify's 7-day
//    asset cache serves a stale tracker to returning visitors.
const stamps = new Set();
for (const file of [FOOTER, ...pages.map((p) => path.join(ROOT, p))]) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/checkout-tracking\.js\?v=([A-Za-z0-9-]+)/g)) stamps.add(m[1]);
}
if (stamps.size > 1) {
  errors.push(`checkout-tracking.js is referenced under ${stamps.size} different ?v= stamps (${[...stamps].join(", ")}). Whichever loads first wins, so a stale copy can silently take over. Use one stamp.`);
} else if (stamps.size === 1) {
  notes.push(`tracker version: ${[...stamps][0]}`);
}

// 5. Never invent a purchase value. In July 2026 three Audio Plugin Deals
//    100%-off redemptions (amount_total 0, no charge) were priced from a
//    hardcoded table on success.html and reported $20 each, putting $60 of
//    revenue in GA4 that never existed. Purchase value comes from Stripe or
//    the event is not sent.
const successPage = path.join(ROOT, "success.html");
if (fs.existsSync(successPage)) {
  const success = fs.readFileSync(successPage, "utf8");
  if (/priceByProduct/.test(success)) {
    errors.push("success.html: found a priceByProduct lookup table. Purchase value must come from Stripe's amount_total, never a per-product guess.");
  }
}

// 6. A $0 promo redemption is not a sale. reportPurchase must branch on value
//    so giveaways do not land on the `purchase` key event.
const ga4Lib = path.join(ROOT, "netlify", "functions", "lib", "ga4.js");
if (fs.existsSync(ga4Lib)) {
  // Strip comments first -- the comment above the branch mentions both event
  // names, so a naive substring test would pass on deleted code.
  const lib = fs
    .readFileSync(ga4Lib, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  if (!/value\s*>\s*0/.test(lib) || !/["']free_redemption["']/.test(lib)) {
    errors.push("netlify/functions/lib/ga4.js: reportPurchase no longer branches on value > 0 to send free_redemption. A 100%-off Checkout Session is payment_status 'paid' with amount_total 0 and would be reported as a purchase key event.");
  }
}

// 7. The APD window dates are duplicated in four files (a static site has no
//    shared server config). If someone edits one and not the others, part of the
//    site goes dark on the wrong days -- fail the build instead.
const APD_DATE_FILES = [
  path.join(ROOT, "components", "apd-window.js"),
  path.join(ROOT, "components", "nav.js"),
  path.join(ROOT, "netlify", "functions", "drip-day3.js"),
  path.join(ROOT, "netlify", "functions", "drip-day7.js"),
];
const starts = new Set(); const ends = new Set();
for (const f of APD_DATE_FILES) {
  if (!fs.existsSync(f)) { errors.push(`${path.relative(ROOT, f)}: missing, but it carries APD window dates.`); continue; }
  const t = fs.readFileSync(f, "utf8");
  const s = t.match(/APD_START\s*=\s*Date\.parse\(['"]([^'"]+)['"]\)/) || t.match(/var START\s*=\s*Date\.parse\(['"]([^'"]+)['"]\)/);
  const e = t.match(/APD_END\s*=\s*Date\.parse\(['"]([^'"]+)['"]\)/) || t.match(/var END\s*=\s*Date\.parse\(['"]([^'"]+)['"]\)/);
  if (!s || !e) { errors.push(`${path.relative(ROOT, f)}: could not find APD window dates.`); continue; }
  starts.add(s[1]); ends.add(e[1]);
}
if (starts.size > 1 || ends.size > 1) {
  errors.push(`APD window dates disagree across files (starts: ${[...starts].join(", ")}; ends: ${[...ends].join(", ")}). All four files must carry the same window.`);
}

// 8. Every data-apd-hide element must have its sweep script on the page, or the
//    sale markup never goes dark during the window.
for (const page of pages) {
  const html = fs.readFileSync(path.join(ROOT, page), "utf8");
  if (html.includes("data-apd-hide") && !html.includes("components/apd-window.js")) {
    errors.push(`${page}: has data-apd-hide markup but never loads components/apd-window.js.`);
  }
}

notes.push(`${mapped.size} payment links mapped, ${seenLinks.size} in use across ${pages.length} pages`);

if (errors.length) {
  console.error("\nTracking check FAILED:\n");
  for (const e of errors) console.error("  - " + e);
  console.error("");
  process.exit(1);
}
console.log("Tracking check passed (" + notes.join("; ") + ")");
