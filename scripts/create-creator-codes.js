#!/usr/bin/env node
/*
 * Creator program: mint the two Stripe codes every creator gets, and keep the ledger.
 *
 *   printf 'Stripe secret key: '; read -rs STRIPE_SECRET_KEY; echo; export STRIPE_SECRET_KEY
 *   node scripts/create-creator-codes.js --csv=creators.csv
 *   node scripts/create-creator-codes.js --slug=baphometrix --name="Baphometrix" --email=x@y.com
 *
 * Per creator this creates:
 *   1. AUDIENCE code   e.g. BAPHOMETRIX20   20% off, unlimited uses, any product,
 *                      valid 12 months. This is the code they share. Every
 *                      redemption is attributed to them by creator-payouts.js.
 *   2. REVIEW code     e.g. REVIEW-BAPHOMETRIX   100% off, ONE use, restricted to the
 *                      All 7 bundle product, valid 90 days. They redeem it through
 *                      the normal checkout, the webhook mints their keys and sends
 *                      the delivery email - no manual key generation.
 *
 * Both codes carry metadata (program=creator-2026, creator_slug, commission_rate)
 * so the payout report can find them without this ledger. The ledger is still
 * written (creator-codes-ledger.csv, gitignored: it has emails) because it is
 * the file you open when a creator asks "what was my code again".
 *
 * Options:
 *   --csv=FILE            columns: slug,name,email[,handle][,platform][,code]   (header row required)
 *   --slug/--name/--email one creator from the command line
 *   --percent=20          audience discount
 *   --commission=0.30     recorded in metadata; creator-payouts.js reads it
 *   --review-link=dRmbJ16AFbBgcLT6f13oA0k   the buy.stripe.com slug of the All 7 bundle
 *                         link; the bundle PRODUCT is resolved from it
 *   --no-review           audience code only
 *   --dry-run             print what would be created, call nothing
 *
 * Safe to re-run: a creator whose audience code already exists in Stripe is
 * skipped for that code (Stripe refuses duplicate promotion codes anyway).
 *
 * WARNING - partner exclusives: during an APD/ADSR exclusive window the payment
 * links have promotion codes DISABLED, and any discount you advertise outside
 * the partner breaches the written promise. Do not hand out audience codes
 * while a window is open (see apd_partnership / partner_channels notes).
 */
const fs = require("fs");
const path = require("path");
const { stripe } = require("./lib/stripe-http");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, "").split("=");
    return [k, rest.length ? rest.join("=") : true];
  })
);

const PERCENT = parseInt(args.percent || "20", 10);
const COMMISSION = String(args.commission || "0.30");
const REVIEW_LINK_SLUG = args["review-link"] || "dRmbJ16AFbBgcLT6f13oA0k"; // All 7 bundle, $55 link
const DRY_RUN = !!args["dry-run"];
const NO_REVIEW = !!args["no-review"];
const LEDGER = path.resolve(__dirname, "..", "creator-codes-ledger.csv");
const PROGRAM = "creator-2026";
const DAY = 24 * 60 * 60;

if (!Number.isFinite(PERCENT) || PERCENT < 1 || PERCENT > 90) {
  console.error("--percent must be 1-90");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);
}

function parseCsv(text) {
  // Small RFC-4180-ish parser: quoted fields, doubled quotes, CRLF.
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map((h) => h.trim().toLowerCase());
  return rows.filter((r) => r.some((v) => v.trim())).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] || "").trim()])));
}

function loadCreators() {
  if (args.csv) {
    const rows = parseCsv(fs.readFileSync(path.resolve(args.csv), "utf8"));
    return rows.map((r) => ({
      slug: slugify(r.slug || r.handle || r.name),
      name: r.name || r.handle || r.slug,
      email: r.email || "",
      handle: r.handle || "",
      platform: r.platform || "",
      code: r.code ? r.code.toUpperCase() : "",
    }));
  }
  if (args.slug || args.name) {
    return [{
      slug: slugify(args.slug || args.name),
      name: args.name || args.slug,
      email: args.email || "",
      handle: args.handle || "",
      platform: args.platform || "",
      code: args.code ? String(args.code).toUpperCase() : "",
    }];
  }
  console.error("Give --csv=FILE or --slug=... --name=... --email=...");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------
const LEDGER_HEADER = "created_at,slug,name,email,handle,platform,audience_code,audience_promo_id,audience_coupon_id,review_code,review_promo_id,review_coupon_id,review_expires";
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function readLedger() {
  if (!fs.existsSync(LEDGER)) return [];
  return parseCsv(fs.readFileSync(LEDGER, "utf8"));
}
function appendLedger(row) {
  if (!fs.existsSync(LEDGER)) fs.writeFileSync(LEDGER, LEDGER_HEADER + "\n");
  const cols = LEDGER_HEADER.split(",");
  fs.appendFileSync(LEDGER, cols.map((c) => csvCell(row[c])).join(",") + "\n");
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
async function resolveBundleProduct() {
  // The All 7 bundle payment link -> its line item -> the product id. Resolved
  // rather than hardcoded so a re-priced link keeps working.
  const links = await stripe.list("payment_links", { active: true }, { max: 300 });
  const link = links.find((l) => String(l.url || "").endsWith("/" + REVIEW_LINK_SLUG));
  if (!link) throw new Error(`No active payment link ends with /${REVIEW_LINK_SLUG}. Pass --review-link=<slug>.`);
  const items = await stripe.get(`payment_links/${link.id}/line_items`, { limit: 10 });
  const product = items.data[0]?.price?.product;
  if (!product) throw new Error(`Payment link ${link.id} has no line item product`);
  return { linkId: link.id, url: link.url, product, allowPromo: !!link.allow_promotion_codes };
}

// Stripe API 2025-09-30.clover moved promotion_code.coupon to promotion.coupon
// (both on create and on the returned object). This account is on the new
// shape, but the scripts pin no version, so try nested first and fall back to
// the flat param if Stripe rejects it. Same approach as generate-apd-codes.js.
let promoShape = null; // "nested" | "flat", sticky once one works
async function postPromotionCode(couponId, fields, idemBase) {
  const shapes = promoShape ? [promoShape] : ["nested", "flat"];
  let lastErr;
  for (const shape of shapes) {
    const params = shape === "nested"
      ? { promotion: { type: "coupon", coupon: couponId }, ...fields }
      : { coupon: couponId, ...fields };
    try {
      const promo = await stripe.post("promotion_codes", params, { idempotencyKey: `${idemBase}-${shape}` });
      promoShape = shape;
      return promo;
    } catch (err) {
      lastErr = err;
      const shapeRejected = err.status === 400 && /unknown parameter|promotion|coupon/i.test(err.message) && !/already exists/i.test(err.message);
      if (promoShape || !shapeRejected) throw err;
    }
  }
  throw lastErr;
}

// Coupon reference on a promotion code, whichever API shape came back.
function promoCoupon(promo) {
  return (promo.promotion && promo.promotion.coupon) || promo.coupon || null;
}

async function findPromotionCode(code) {
  const res = await stripe.get("promotion_codes", { code, limit: 1 });
  return res.data[0] || null;
}

async function createAudienceCode(c, code) {
  const existing = await findPromotionCode(code);
  if (existing) {
    console.log(`  audience code ${code} already exists (${existing.id}) - reusing`);
    return { promo: existing, coupon: promoCoupon(existing) };
  }
  const coupon = await stripe.post("coupons", {
    name: `Creator ${PERCENT}%: ${c.name}`.slice(0, 40),
    percent_off: PERCENT,
    duration: "once",
    redeem_by: Math.floor(Date.now() / 1000) + 365 * DAY,
    metadata: { program: PROGRAM, creator_slug: c.slug, creator_name: c.name, kind: "audience", commission_rate: COMMISSION },
  }, { idempotencyKey: `creator-audience-coupon-${c.slug}-${PERCENT}` });
  const promo = await postPromotionCode(coupon.id, {
    code,
    active: true,
    metadata: { program: PROGRAM, creator_slug: c.slug, creator_name: c.name, kind: "audience", commission_rate: COMMISSION },
  }, `creator-audience-promo-${c.slug}-${code}`);
  return { promo, coupon };
}

async function createReviewCode(c, code, bundle) {
  const existing = await findPromotionCode(code);
  if (existing) {
    console.log(`  review code ${code} already exists (${existing.id}) - reusing`);
    return { promo: existing, coupon: promoCoupon(existing), expires: existing.expires_at };
  }
  const expires = Math.floor(Date.now() / 1000) + 90 * DAY;
  const coupon = await stripe.post("coupons", {
    name: `Creator review copy: ${c.name}`.slice(0, 40),
    percent_off: 100,
    duration: "once",
    max_redemptions: 1,
    redeem_by: expires,
    applies_to: { products: [bundle.product] },
    metadata: { program: PROGRAM, creator_slug: c.slug, creator_name: c.name, kind: "review", commission_rate: "0" },
  }, { idempotencyKey: `creator-review-coupon-${c.slug}` });
  const promo = await postPromotionCode(coupon.id, {
    code,
    active: true,
    max_redemptions: 1,
    expires_at: expires,
    metadata: { program: PROGRAM, creator_slug: c.slug, creator_name: c.name, kind: "review", commission_rate: "0" },
  }, `creator-review-promo-${c.slug}-${code}`);
  return { promo, coupon, expires };
}

// ---------------------------------------------------------------------------
(async () => {
  const creators = loadCreators();
  const ledger = readLedger();
  const done = new Set(ledger.map((r) => r.slug));

  let bundle = null;
  if (!NO_REVIEW && !DRY_RUN) {
    bundle = await resolveBundleProduct();
    console.log(`Review copies redeem against ${bundle.product} via ${bundle.url}`);
    if (!bundle.allowPromo) {
      console.log("  WARNING: that payment link has promotion codes DISABLED (partner window?). Review codes will not");
      console.log("  be accepted at checkout until allow_promotion_codes is turned back on for the link.");
    }
  }

  const blocks = [];
  for (const c of creators) {
    if (!c.slug) { console.log(`skipping row with no slug/name: ${JSON.stringify(c)}`); continue; }
    const audienceCode = c.code || `${c.slug.replace(/-/g, "").toUpperCase().slice(0, 16)}${PERCENT}`;
    const reviewCode = `REVIEW-${c.slug.replace(/-/g, "").toUpperCase().slice(0, 16)}`;
    console.log(`\n${c.name} (${c.slug})${done.has(c.slug) ? "  [already in ledger]" : ""}`);
    if (done.has(c.slug) && !args.force) { console.log("  skip - use --force to mint again"); continue; }

    if (DRY_RUN) {
      console.log(`  would create audience code ${audienceCode} (${PERCENT}% off, 12 months)`);
      if (!NO_REVIEW) console.log(`  would create review code ${reviewCode} (100% off All 7 bundle, 1 use, 90 days)`);
      continue;
    }

    const audience = await createAudienceCode(c, audienceCode);
    let review = null;
    if (!NO_REVIEW) review = await createReviewCode(c, reviewCode, bundle);

    const row = {
      created_at: new Date().toISOString(),
      slug: c.slug, name: c.name, email: c.email, handle: c.handle, platform: c.platform,
      audience_code: audience.promo.code, audience_promo_id: audience.promo.id,
      audience_coupon_id: typeof audience.coupon === "string" ? audience.coupon : (audience.coupon && audience.coupon.id) || "",
      review_code: review ? review.promo.code : "", review_promo_id: review ? review.promo.id : "",
      review_coupon_id: review ? (typeof review.coupon === "string" ? review.coupon : (review.coupon && review.coupon.id) || "") : "",
      review_expires: review && review.expires ? new Date(review.expires * 1000).toISOString().slice(0, 10) : "",
    };
    appendLedger(row);
    console.log(`  audience: ${row.audience_code}   review: ${row.review_code || "-"}   -> ledger`);

    blocks.push([
      `--- ${c.name} <${c.email}> ---`,
      `Your code for your audience: ${row.audience_code}  (${PERCENT}% off anything at carbonatedaudio.com, 12 months)`,
      review ? `Your free All 7 license: go to ${bundle.url} and enter ${row.review_code} at checkout (one use, expires ${row.review_expires})` : "",
      "",
    ].filter((l) => l !== undefined).join("\n"));
  }

  if (blocks.length) {
    console.log("\n===== paste-ready =====\n" + blocks.join("\n"));
    console.log(`Ledger: ${LEDGER}`);
  }
})().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
