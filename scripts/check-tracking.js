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
const META_PIXEL_ID = "1682413179857373";

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
// Top-level pages plus the add-ons subfolder (addons/expansion-packs.html,
// addons/templates.html sell things too and must pass the same checks).
const pages = [
  ...fs.readdirSync(ROOT).filter((f) => f.endsWith(".html")),
  ...(fs.existsSync(path.join(ROOT, "addons")) ? fs.readdirSync(path.join(ROOT, "addons")).filter((f) => f.endsWith(".html")).map((f) => "addons/" + f) : []),
];
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
  // tallboy.html shipped 2026-08-23 with GA4 but no Meta Pixel, and nobody
  // noticed until paid ads were being planned two weeks later. A selling page
  // the pixel cannot see cannot be retargeted or optimised for.
  if (!html.includes(`fbq("init","${META_PIXEL_ID}")`) && !html.includes(`fbq('init', '${META_PIXEL_ID}')`)) {
    errors.push(`${page}: has a Stripe buy link but no Meta Pixel (${META_PIXEL_ID}). Paid traffic to it is invisible to Ads Manager.`);
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

// ---------------------------------------------------------------------------
// UNGATED_PRICE: no page in the sitemap may state a promotional price unless it
// also loads the APD sweep that can hide it.
//
// This exists because four comparison pages (ontap-vs-kickstart,
// desipper-vs-soothe, desipper-vs-spitfish, pour-vs-ozone-imager) sat in the
// sitemap saying "all 7 plugins are $55" all the way into the first day of an
// exclusive window that promised the opposite. The earlier gating checks only
// validated pages that ALREADY declared data-apd-hide, so a page that simply
// never opted in was invisible to them. That is the wrong direction: the check
// has to start from "what does the public see", not "what did we remember to
// mark up".
// ---------------------------------------------------------------------------
{
  const sitemapPath = path.join(ROOT, "sitemap.xml");
  if (fs.existsSync(sitemapPath)) {
    const sm = fs.readFileSync(sitemapPath, "utf8");
    const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const PROMO = /\$(?:55|45|39\.99|29\.99)\b/g;
    const offenders = [];
    for (const u of locs) {
      const rel = u.split("carbonatedaudio.com")[1] || "/";
      const file = rel === "/" ? "index.html" : rel.replace(/^\//, "").replace(/\/$/, "") + ".html";
      const full = path.join(ROOT, file);
      if (!fs.existsSync(full)) continue;
      const html = fs.readFileSync(full, "utf8");
      const body = html.replace(/<script[\s\S]*?<\/script>/gi, "");
      const hits = body.match(PROMO);
      if (hits && !html.includes("apd-window.js")) {
        offenders.push(`${file} states ${[...new Set(hits)].join(", ")} but never loads apd-window.js`);
      }
    }
    for (const o of offenders) {
      errors.push(
        `${o}. During a partner exclusive this price is public and the sweep ` +
          "cannot remove it. Either take the number out of the copy (preferred - " +
          "a sentence with no price in it cannot leak in a future window) or add " +
          "data-apd-hide markup plus the apd-window.js include to that page."
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 9. ADD-ONS: components/addons-catalog.js is the one source for expansion
//    packs, Pro Tools templates and the Mega Bundle. Nothing may go on sale
//    half-wired, and no page may show a price the catalog does not.
// ---------------------------------------------------------------------------
{
  const CATALOG_PATH = path.join(ROOT, "components", "addons-catalog.js");
  if (fs.existsSync(CATALOG_PATH)) {
    const cat = require(CATALOG_PATH);
    const { PRODUCTS } = require(path.join(ROOT, "netlify", "functions", "config.js"));

    const sellable = [...cat.items, cat.mega];
    for (const it of sellable) {
      if (it.status !== "live") continue;
      const id = (String(it.paymentLink || "").match(/buy\.stripe\.com\/(?:test\/)?([A-Za-z0-9]+)/) || [])[1];
      if (!id) errors.push(`addons-catalog.js: ${it.id} is live but has no buy.stripe.com paymentLink.`);
      else if (!mapped.has(id)) errors.push(`addons-catalog.js: ${it.id} payment link ${id} is missing from the products map in components/checkout-tracking.js.`);
      if (it !== cat.mega && !it.file) errors.push(`addons-catalog.js: ${it.id} is live but names no release file to deliver.`);
    }
    if (cat.mega.status === "live") {
      const notLive = cat.items.filter((it) => it.status !== "live").map((it) => it.id);
      // A live Mega Bundle with unreleased items is a PREORDER. Allowed only
      // when the catalog says so explicitly, and then every page that sells
      // it must tell the buyer the add-ons arrive later.
      if (notLive.length && !cat.mega.preorder) {
        errors.push(`addons-catalog.js: the Mega Bundle is live but these items it promises are not: ${notLive.join(", ")}. Set mega.preorder = true only if the pages say add-ons ship later.`);
      }
      if (notLive.length && cat.mega.preorder) {
        for (const f of ["mega-bundle.html", "addons.html", "addons/expansion-packs.html", "addons/templates.html"]) {
          const full = path.join(ROOT, f);
          if (!fs.existsSync(full)) continue;
          const html = fs.readFileSync(full, "utf8");
          if (html.includes(cat.mega.paymentLink) && !/as each one drops|as they drop/.test(html)) {
            errors.push(`${f}: sells the Mega Bundle but never tells the buyer the add-ons arrive later.`);
          }
        }
      }
    }

    // The "7 plugins, $129" line must equal what the plugins actually cost.
    const pluginSum = cat.mega.plugins.reduce((sum, id) => sum + ((PRODUCTS[id] && PRODUCTS[id].price) || 0), 0);
    if (pluginSum !== cat.mega.pluginsValue) {
      errors.push(`addons-catalog.js: mega.pluginsValue is ${cat.mega.pluginsValue} but the plugins in config.js add up to ${pluginSum}.`);
    }

    // Static fallback prices on the pages must match the catalog.
    const addonPages = ["addons.html", "mega-bundle.html", "addons/expansion-packs.html", "addons/templates.html"]
      .map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f));
    const megaValue = cat.megaValue();
    for (const file of addonPages) {
      const html = fs.readFileSync(file, "utf8");
      const rel = path.relative(ROOT, file);
      for (const m of html.matchAll(/data-price-of="([^"]+)">\$(\d+)</g)) {
        const it = cat.byId(m[1]);
        if (!it) errors.push(`${rel}: data-price-of="${m[1]}" is not in the catalog.`);
        else if (Number(m[2]) !== it.price) errors.push(`${rel}: shows $${m[2]} for ${m[1]}, catalog says $${it.price}.`);
      }
      for (const m of html.matchAll(/data-mega-value>\$([\d,]+)</g)) {
        if (Number(m[1].replace(/,/g, "")) !== megaValue) errors.push(`${rel}: Mega Bundle value shows $${m[1]}, catalog adds up to $${megaValue}.`);
      }
      for (const m of html.matchAll(/data-mega-save>\$(\d+)</g)) {
        if (Number(m[1]) !== megaValue - cat.mega.price) errors.push(`${rel}: Mega Bundle saving shows $${m[1]}, catalog says $${megaValue - cat.mega.price}.`);
      }
    }

    // One cache-busting stamp for the catalog everywhere it is loaded.
    const catStamps = new Set();
    for (const file of [path.join(ROOT, "components", "nav.js"), ...addonPages]) {
      for (const m of fs.readFileSync(file, "utf8").matchAll(/addons-catalog\.js\?v=([A-Za-z0-9-]+)/g)) catStamps.add(m[1]);
    }
    if (catStamps.size > 1) errors.push(`addons-catalog.js is loaded under ${catStamps.size} different ?v= stamps (${[...catStamps].join(", ")}). Use one.`);
    notes.push(`add-ons: ${cat.items.filter((i) => i.status === "live").length}/${cat.items.length} live, mega ${cat.mega.status}`);
  }
}

if (errors.length) {
  console.error("\nTracking check FAILED:\n");
  for (const e of errors) console.error("  - " + e);
  console.error("");
  process.exit(1);
}

console.log("Tracking check passed (" + notes.join("; ") + ")");
