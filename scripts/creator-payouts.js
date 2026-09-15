#!/usr/bin/env node
/*
 * Creator program: monthly payout report.
 *
 *   printf 'Stripe secret key: '; read -rs STRIPE_SECRET_KEY; echo; export STRIPE_SECRET_KEY
 *   node scripts/creator-payouts.js                       # previous calendar month (UTC)
 *   node scripts/creator-payouts.js --from=2026-09-14 --to=2026-09-30
 *
 * Walks every paid Checkout Session in the range, finds the ones that used a
 * creator audience code (identified by the coupon metadata create-creator-codes.js
 * wrote: program=creator-2026, kind=audience), and works out what each creator is
 * owed:
 *
 *   commission = commission_rate x (amount paid - Stripe fee)      per order
 *
 * Refunded orders are excluded. Review-copy redemptions (kind=review, $0) are
 * listed for information and pay nothing.
 *
 * Output: creator-payouts-<from>-<to>.csv (per creator) and
 *         creator-payouts-<from>-<to>-orders.csv (per order), both gitignored,
 *         plus a summary on stdout. Payouts themselves are manual (PayPal) -
 *         this only tells you the numbers.
 *
 * Needs a key that can read checkout sessions, payment intents and charges.
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

function defaultRange() {
  const now = new Date();
  const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const firstOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return {
    from: firstOfLastMonth.toISOString().slice(0, 10),
    to: new Date(firstOfThisMonth.getTime() - 1).toISOString().slice(0, 10),
  };
}
const range = defaultRange();
const FROM = args.from || range.from;
const TO = args.to || range.to;
const fromTs = Math.floor(new Date(`${FROM}T00:00:00Z`).getTime() / 1000);
const toTs = Math.floor(new Date(`${TO}T23:59:59Z`).getTime() / 1000);
if (!Number.isFinite(fromTs) || !Number.isFinite(toTs) || fromTs > toTs) {
  console.error("--from and --to must be YYYY-MM-DD, from <= to");
  process.exit(1);
}
const OUT_DIR = path.resolve(__dirname, "..");
const PROGRAM = "creator-2026";

const money = (cents, cur = "usd") => `${(cents / 100).toFixed(2)} ${cur.toUpperCase()}`;
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function writeCsv(file, header, rows) {
  fs.writeFileSync(file, [header.join(","), ...rows.map((r) => header.map((h) => csvCell(r[h])).join(","))].join("\n") + "\n");
}

// promotion_code id -> the human code (BAPHOMETRIX20), cached per run.
const codeCache = new Map();
async function humanCode(promoId) {
  if (!promoId) return "";
  if (!codeCache.has(promoId)) {
    try { codeCache.set(promoId, (await stripe.get(`promotion_codes/${promoId}`)).code || promoId); }
    catch { codeCache.set(promoId, promoId); }
  }
  return codeCache.get(promoId);
}

// Pull the creator attribution out of a session's expanded discount breakdown.
// The coupon object carries the metadata; the promotion code id is on the
// discount. Stripe API 2025-09-30.clover removed the auto-expanded
// discount.coupon and replaced it with discount.source.coupon (a bare id), so
// read either shape and fetch the coupon when it is an id. Without this every
// creator order on the new API silently attributes to nobody and pays $0.
const couponCache = new Map();
async function loadCoupon(ref) {
  if (!ref) return null;
  if (typeof ref !== "string") return ref;
  if (!couponCache.has(ref)) couponCache.set(ref, await stripe.get(`coupons/${ref}`));
  return couponCache.get(ref);
}
async function creatorDiscount(session) {
  const discounts = session.total_details?.breakdown?.discounts || [];
  for (const d of discounts) {
    const disc = d.discount || {};
    const coupon = await loadCoupon(disc.source?.coupon || disc.coupon);
    const md = (coupon && coupon.metadata) || {};
    if (md.program === PROGRAM) {
      return {
        kind: md.kind || "audience",
        slug: md.creator_slug || "unknown",
        name: md.creator_name || md.creator_slug || "unknown",
        rate: Number(md.commission_rate || 0),
        promotion_code: await humanCode(typeof disc.promotion_code === "string" ? disc.promotion_code : disc.promotion_code?.id || ""),
        coupon_id: coupon.id || "",
        discount_amount: d.amount || 0,
      };
    }
  }
  return null;
}

async function feeAndRefund(session) {
  if (!session.payment_intent) return { fee: 0, refunded: 0, charge: "" };
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
  const pi = await stripe.get(`payment_intents/${piId}`, { "expand[]": "latest_charge.balance_transaction" });
  const ch = pi.latest_charge;
  if (!ch || typeof ch === "string") return { fee: 0, refunded: 0, charge: typeof ch === "string" ? ch : "" };
  const bt = ch.balance_transaction;
  return {
    fee: bt && typeof bt === "object" ? bt.fee || 0 : 0,
    refunded: ch.amount_refunded || 0,
    charge: ch.id,
  };
}

(async () => {
  console.log(`Creator payouts ${FROM} .. ${TO} (UTC)`);
  const sessions = await stripe.list("checkout/sessions", {
    "created[gte]": fromTs,
    "created[lte]": toTs,
    "expand[]": "data.total_details.breakdown",
  }, { max: 5000 });

  const paid = sessions.filter((s) => s.status === "complete" && s.payment_status === "paid");
  console.log(`${sessions.length} sessions in range, ${paid.length} complete+paid`);

  const orders = [];
  const reviews = [];
  for (const s of paid) {
    const attr = await creatorDiscount(s);
    if (!attr) continue;
    const email = s.customer_details?.email || s.customer_email || "";
    const created = new Date(s.created * 1000).toISOString().slice(0, 19).replace("T", " ");
    const product = s.metadata?.product || "";
    if (attr.kind === "review" || (s.amount_total || 0) === 0) {
      reviews.push({ created, session: s.id, creator_slug: attr.slug, creator: attr.name, code: attr.promotion_code, email, product });
      continue;
    }
    const { fee, refunded, charge } = await feeAndRefund(s);
    const gross = s.amount_total || 0;
    const net = Math.max(0, gross - fee - refunded);
    const commission = refunded >= gross ? 0 : Math.round(net * attr.rate);
    orders.push({
      created, session: s.id, charge, creator_slug: attr.slug, creator: attr.name, code: attr.promotion_code,
      product, buyer_email: email, currency: (s.currency || "usd").toUpperCase(),
      gross_cents: gross, discount_cents: attr.discount_amount, stripe_fee_cents: fee, refunded_cents: refunded,
      net_cents: net, rate: attr.rate, commission_cents: commission,
      status: refunded >= gross && gross > 0 ? "refunded" : refunded > 0 ? "partial-refund" : "paid",
    });
  }

  // Per-creator rollup
  const byCreator = new Map();
  for (const o of orders) {
    const k = o.creator_slug;
    const row = byCreator.get(k) || { creator_slug: k, creator: o.creator, code: o.code, orders: 0, gross_cents: 0, stripe_fee_cents: 0, refunded_cents: 0, net_cents: 0, commission_cents: 0, currency: o.currency };
    row.orders += 1;
    row.gross_cents += o.gross_cents;
    row.stripe_fee_cents += o.stripe_fee_cents;
    row.refunded_cents += o.refunded_cents;
    row.net_cents += o.net_cents;
    row.commission_cents += o.commission_cents;
    byCreator.set(k, row);
  }
  for (const r of reviews) {
    const row = byCreator.get(r.creator_slug) || { creator_slug: r.creator_slug, creator: r.creator, code: "", orders: 0, gross_cents: 0, stripe_fee_cents: 0, refunded_cents: 0, net_cents: 0, commission_cents: 0, currency: "USD" };
    row.review_redeemed = "yes";
    byCreator.set(r.creator_slug, row);
  }

  const summary = [...byCreator.values()].map((r) => ({
    ...r,
    review_redeemed: r.review_redeemed || "",
    gross: (r.gross_cents / 100).toFixed(2), stripe_fees: (r.stripe_fee_cents / 100).toFixed(2), refunded: (r.refunded_cents / 100).toFixed(2),
    net: (r.net_cents / 100).toFixed(2), commission_due: (r.commission_cents / 100).toFixed(2),
  })).sort((a, b) => b.commission_cents - a.commission_cents);

  const summaryFile = path.join(OUT_DIR, `creator-payouts-${FROM}-${TO}.csv`);
  const ordersFile = path.join(OUT_DIR, `creator-payouts-${FROM}-${TO}-orders.csv`);
  writeCsv(summaryFile, ["creator_slug", "creator", "code", "orders", "currency", "gross", "stripe_fees", "refunded", "net", "commission_due", "review_redeemed"], summary);
  writeCsv(ordersFile, ["created", "creator_slug", "creator", "code", "product", "buyer_email", "currency", "gross_cents", "discount_cents", "stripe_fee_cents", "refunded_cents", "net_cents", "rate", "commission_cents", "status", "session", "charge"], orders);

  console.log("");
  if (!summary.length) {
    console.log("No creator-code orders in this range.");
  } else {
    for (const r of summary) {
      console.log(`${r.creator.padEnd(28)} ${String(r.orders).padStart(3)} orders  gross ${money(r.gross_cents, r.currency)}  net ${money(r.net_cents, r.currency)}  OWED ${money(r.commission_cents, r.currency)}${r.review_redeemed ? "  (review copy redeemed)" : ""}`);
    }
    const total = summary.reduce((n, r) => n + r.commission_cents, 0);
    console.log(`\nTotal commission due: ${money(total)}`);
  }
  console.log(`\nWrote ${summaryFile}\n      ${ordersFile}`);
})().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
