// Creator program data layer, shared by partners-admin.js (SODA's board) and
// partner-portal.js (the private page each creator gets).
//
// Source of truth split:
//   Stripe  - the codes themselves and every order. Earnings are always
//             recomputed from checkout sessions, never typed in by hand.
//   Blobs   - who the creator is (email, channel, PayPal, status, notes), the
//             payouts SODA has actually sent, and the portal link index.
//
// Record: store "creators", key creator_<slug>
// Portal index: key token_<sha256(token)> -> { slug }. The raw token is only
// ever returned once (on approve / rotate); the record keeps the hash, so a
// leaked blob listing cannot be turned into working portal links.
//
// Stripe API shapes: the functions use stripe-node v14 (pinned 2023-10-16,
// flat promotion_code.coupon, expanded discount.coupon). The operator scripts
// run on the account default (2025-09-30.clover: promotion.coupon and
// discount.source.coupon). Everything here reads both shapes so the two paths
// can never disagree about who earned what.
const crypto = require("crypto");
const { getBlobStore } = require("./store");

const PROGRAM = "creator-2026";
const PROGRAM_START = "2026-09-01"; // first month earnings are counted from
const AUDIENCE_PERCENT = 20;
const COMMISSION = "0.30";
const REVIEW_LINK_SLUG = "dRmbJ16AFbBgcLT6f13oA0k"; // All 7 bundle payment link
const DAY = 24 * 60 * 60;
const STATUSES = ["active", "paused", "ended"];

const creatorsStore = () => getBlobStore("creators");
const cacheStore = () => getBlobStore("creator-earnings-cache");
const applicationsStore = () => getBlobStore("creator-applications");

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);
}
function audienceCodeFor(slug) {
  return `${slug.replace(/-/g, "").toUpperCase().slice(0, 16)}${AUDIENCE_PERCENT}`;
}
function reviewCodeFor(slug) {
  return `REVIEW-${slug.replace(/-/g, "").toUpperCase().slice(0, 16)}`;
}
const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");
const idOf = (ref) => (ref && typeof ref === "object" ? ref.id : ref) || "";
function promoCouponRef(promo) {
  return (promo && ((promo.promotion && promo.promotion.coupon) || promo.coupon)) || null;
}
function monthKey(date) {
  return new Date(date).toISOString().slice(0, 7);
}
function monthBounds(month) {
  const [y, m] = month.split("-").map(Number);
  const from = Date.UTC(y, m - 1, 1) / 1000;
  const to = Date.UTC(y, m, 1) / 1000 - 1;
  return { from, to };
}
function monthsSinceStart(now = new Date()) {
  const out = [];
  let [y, m] = PROGRAM_START.slice(0, 7).split("-").map(Number);
  const end = monthKey(now);
  for (;;) {
    const k = `${y}-${String(m).padStart(2, "0")}`;
    out.push(k);
    if (k >= end) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

// ---------------------------------------------------------------------------
// records
// ---------------------------------------------------------------------------
async function getCreator(slug) {
  return creatorsStore().get(`creator_${slug}`, { type: "json" }).catch(() => null);
}
async function saveCreator(rec) {
  rec.updated_at = new Date().toISOString();
  await creatorsStore().setJSON(`creator_${rec.slug}`, rec);
  return rec;
}
async function listCreators() {
  const store = creatorsStore();
  let blobs = [];
  try { blobs = (await store.list({ prefix: "creator_" })).blobs || []; } catch { return []; }
  const recs = await Promise.all(blobs.map(({ key }) => store.get(key, { type: "json" }).catch(() => null)));
  return recs.filter(Boolean).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
function newCreator(fields) {
  const now = new Date().toISOString();
  return {
    slug: fields.slug,
    name: fields.name || fields.slug,
    email: fields.email || "",
    platform: fields.platform || "",
    channel_url: fields.channel_url || "",
    paypal_email: "",
    status: "active",
    commission_rate: Number(COMMISSION),
    audience_code: "", audience_promo_id: "", audience_coupon_id: "",
    review_code: "", review_promo_id: "", review_coupon_id: "", review_expires: "",
    application_key: fields.application_key || "",
    portal_token_hash: "",
    portal_link_created_at: "",
    notes: "",
    payouts: [],
    created_at: now,
    updated_at: now,
  };
}

// Returns the raw token. Only the hash is stored.
async function rotatePortalToken(rec) {
  const store = creatorsStore();
  if (rec.portal_token_hash) await store.delete(`token_${rec.portal_token_hash}`).catch(() => {});
  const token = crypto.randomBytes(24).toString("base64url");
  const hash = sha256(token);
  await store.setJSON(`token_${hash}`, { slug: rec.slug });
  rec.portal_token_hash = hash;
  rec.portal_link_created_at = new Date().toISOString();
  await saveCreator(rec);
  return token;
}
async function creatorForToken(token) {
  if (!token || token.length < 20 || token.length > 100) return null;
  const hash = sha256(token);
  const idx = await creatorsStore().get(`token_${hash}`, { type: "json" }).catch(() => null);
  if (!idx || !idx.slug) return null;
  const rec = await getCreator(idx.slug);
  // A rotated or revoked link must stop working even if its index blob lingered.
  if (!rec || rec.portal_token_hash !== hash) return null;
  return rec;
}

// ---------------------------------------------------------------------------
// applications
// ---------------------------------------------------------------------------
async function listApplications() {
  const store = applicationsStore();
  let blobs = [];
  try { blobs = (await store.list()).blobs || []; } catch { return []; }
  const apps = await Promise.all(blobs.map(async ({ key }) => {
    const a = await store.get(key, { type: "json" }).catch(() => null);
    return a ? { key, ...a } : null;
  }));
  return apps.filter(Boolean).sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
}
async function setApplicationStatus(key, status, extra = {}) {
  const store = applicationsStore();
  const app = await store.get(key, { type: "json" }).catch(() => null);
  if (!app) return null;
  Object.assign(app, extra, { status, reviewed_at: new Date().toISOString() });
  await store.setJSON(key, app);
  return app;
}

// ---------------------------------------------------------------------------
// Stripe: codes
// ---------------------------------------------------------------------------
async function findPromotionCode(stripe, code) {
  const res = await stripe.promotionCodes.list({ code, limit: 1 });
  return (res.data && res.data[0]) || null;
}

async function createPromotionCode(stripe, couponId, fields, idempotencyKey) {
  // stripe-node v14 speaks the flat shape; fall back to the nested one in case
  // the SDK or pinned version is ever bumped past 2025-09-30.
  try {
    return await stripe.promotionCodes.create({ coupon: couponId, ...fields }, { idempotencyKey: `${idempotencyKey}-flat` });
  } catch (err) {
    if (!(err && err.statusCode === 400 && /coupon|promotion|unknown parameter/i.test(err.message || ""))) throw err;
    return stripe.promotionCodes.create({ promotion: { type: "coupon", coupon: couponId }, ...fields }, { idempotencyKey: `${idempotencyKey}-nested` });
  }
}

async function resolveBundleProduct(stripe) {
  let link = null;
  for await (const l of stripe.paymentLinks.list({ active: true, limit: 100 })) {
    if (String(l.url || "").endsWith("/" + REVIEW_LINK_SLUG)) { link = l; break; }
  }
  if (!link) throw new Error(`No active payment link ends with /${REVIEW_LINK_SLUG}`);
  const items = await stripe.paymentLinks.listLineItems(link.id, { limit: 10 });
  const price = items.data[0] && items.data[0].price;
  const product = price && idOf(price.product);
  if (!product) throw new Error(`Payment link ${link.id} has no line item product`);
  return { url: link.url, product, allowPromo: !!link.allow_promotion_codes };
}

// Mints (or reuses) both codes. Same codes, amounts, expiry and metadata as
// scripts/create-creator-codes.js, so either path produces identical Stripe state.
async function mintCodes(stripe, rec) {
  const md = (kind, rate) => ({ program: PROGRAM, creator_slug: rec.slug, creator_name: rec.name, kind, commission_rate: rate });
  const audienceCode = audienceCodeFor(rec.slug);
  const reviewCode = reviewCodeFor(rec.slug);
  const now = Math.floor(Date.now() / 1000);

  let audience = await findPromotionCode(stripe, audienceCode);
  if (!audience) {
    const coupon = await stripe.coupons.create({
      name: `Creator ${AUDIENCE_PERCENT}%: ${rec.name}`.slice(0, 40),
      percent_off: AUDIENCE_PERCENT,
      duration: "once",
      redeem_by: now + 365 * DAY,
      metadata: md("audience", COMMISSION),
    }, { idempotencyKey: `creator-audience-coupon-${rec.slug}-${AUDIENCE_PERCENT}` });
    audience = await createPromotionCode(stripe, coupon.id, { code: audienceCode, active: true, metadata: md("audience", COMMISSION) }, `creator-audience-promo-${rec.slug}-${audienceCode}`);
  }

  const bundle = await resolveBundleProduct(stripe);
  let review = await findPromotionCode(stripe, reviewCode);
  if (!review) {
    const expires = now + 90 * DAY;
    const coupon = await stripe.coupons.create({
      name: `Creator review copy: ${rec.name}`.slice(0, 40),
      percent_off: 100,
      duration: "once",
      max_redemptions: 1,
      redeem_by: expires,
      applies_to: { products: [bundle.product] },
      metadata: md("review", "0"),
    }, { idempotencyKey: `creator-review-coupon-${rec.slug}` });
    review = await createPromotionCode(stripe, coupon.id, { code: reviewCode, active: true, max_redemptions: 1, expires_at: expires, metadata: md("review", "0") }, `creator-review-promo-${rec.slug}-${reviewCode}`);
  }

  Object.assign(rec, {
    audience_code: audience.code, audience_promo_id: audience.id, audience_coupon_id: idOf(promoCouponRef(audience)),
    review_code: review.code, review_promo_id: review.id, review_coupon_id: idOf(promoCouponRef(review)),
    review_expires: review.expires_at ? new Date(review.expires_at * 1000).toISOString().slice(0, 10) : "",
  });
  return { bundle };
}

// Pull every creator-2026 promotion code out of Stripe and make sure each has a
// record. Catches codes minted from the terminal script or the Stripe dashboard.
async function syncFromStripe(stripe) {
  const bySlug = new Map();
  for await (const p of stripe.promotionCodes.list({ limit: 100 })) {
    const m = p.metadata || {};
    if (m.program !== PROGRAM || !m.creator_slug) continue;
    const e = bySlug.get(m.creator_slug) || { name: m.creator_name || m.creator_slug };
    e[m.kind === "review" ? "review" : "audience"] = p;
    bySlug.set(m.creator_slug, e);
  }
  const apps = await listApplications();
  const created = [];
  const updated = [];
  for (const [slug, e] of bySlug) {
    let rec = await getCreator(slug);
    const isNew = !rec;
    if (!rec) {
      rec = newCreator({ slug, name: e.name });
      const app = apps.find((a) => String(a.name || "").trim().toLowerCase() === String(e.name).trim().toLowerCase());
      if (app) {
        Object.assign(rec, { email: app.email || "", platform: app.platform || "", channel_url: app.channel_url || "", application_key: app.key });
        await setApplicationStatus(app.key, "approved", { creator_slug: slug });
      }
    }
    if (e.audience) Object.assign(rec, { audience_code: e.audience.code, audience_promo_id: e.audience.id, audience_coupon_id: idOf(promoCouponRef(e.audience)) });
    if (e.review) Object.assign(rec, {
      review_code: e.review.code, review_promo_id: e.review.id, review_coupon_id: idOf(promoCouponRef(e.review)),
      review_expires: e.review.expires_at ? new Date(e.review.expires_at * 1000).toISOString().slice(0, 10) : rec.review_expires,
    });
    await saveCreator(rec);
    (isNew ? created : updated).push(slug);
  }
  return { created, updated };
}

// Live state of a creator's two codes (active? review copy redeemed?).
async function codeState(stripe, rec) {
  const out = { audience_active: null, audience_uses: null, review_redeemed: null, review_active: null };
  if (rec.audience_promo_id) {
    const p = await stripe.promotionCodes.retrieve(rec.audience_promo_id).catch(() => null);
    if (p) { out.audience_active = !!p.active; out.audience_uses = p.times_redeemed || 0; }
  }
  if (rec.review_promo_id) {
    const p = await stripe.promotionCodes.retrieve(rec.review_promo_id).catch(() => null);
    if (p) { out.review_redeemed = (p.times_redeemed || 0) > 0; out.review_active = !!p.active; }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Stripe: earnings
// ---------------------------------------------------------------------------
async function creatorDiscount(stripe, session, couponCache) {
  const discounts = (session.total_details && session.total_details.breakdown && session.total_details.breakdown.discounts) || [];
  for (const d of discounts) {
    const disc = d.discount || {};
    let coupon = (disc.source && disc.source.coupon) || disc.coupon;
    if (coupon && typeof coupon === "string") {
      if (!couponCache.has(coupon)) couponCache.set(coupon, await stripe.coupons.retrieve(coupon).catch(() => null));
      coupon = couponCache.get(coupon);
    }
    const m = (coupon && coupon.metadata) || {};
    if (m.program === PROGRAM) {
      return { kind: m.kind || "audience", slug: m.creator_slug || "unknown", rate: Number(m.commission_rate || 0), discount_cents: d.amount || 0 };
    }
  }
  return null;
}

// One month, every creator. Closed months are cached for a day (refunds can
// still land), the current month for 10 minutes.
async function monthEarnings(stripe, month, { fresh = false } = {}) {
  const cacheKey = `month_${month}`;
  const isCurrent = month === monthKey(new Date());
  const ttl = isCurrent ? 10 * 60 * 1000 : 24 * 60 * 60 * 1000;
  if (!fresh) {
    const hit = await cacheStore().get(cacheKey, { type: "json" }).catch(() => null);
    if (hit && Date.now() - new Date(hit.computed_at).getTime() < ttl) return hit;
  }

  const { from, to } = monthBounds(month);
  const couponCache = new Map();
  const orders = [];
  const reviews = [];
  for await (const s of stripe.checkout.sessions.list({ created: { gte: from, lte: to }, limit: 100, expand: ["data.total_details.breakdown"] })) {
    if (s.status !== "complete" || s.payment_status !== "paid") continue;
    const attr = await creatorDiscount(stripe, s, couponCache);
    if (!attr) continue;
    const created = new Date(s.created * 1000).toISOString();
    const product = (s.metadata && s.metadata.product) || "";
    if (attr.kind === "review" || (s.amount_total || 0) === 0) {
      reviews.push({ slug: attr.slug, created, product });
      continue;
    }
    let fee = 0;
    let refunded = 0;
    if (s.payment_intent) {
      const pi = await stripe.paymentIntents.retrieve(idOf(s.payment_intent), { expand: ["latest_charge.balance_transaction"] }).catch(() => null);
      const ch = pi && pi.latest_charge;
      if (ch && typeof ch === "object") {
        refunded = ch.amount_refunded || 0;
        const bt = ch.balance_transaction;
        fee = bt && typeof bt === "object" ? bt.fee || 0 : 0;
      }
    }
    const gross = s.amount_total || 0;
    const net = Math.max(0, gross - fee - refunded);
    const commission = refunded >= gross ? 0 : Math.round(net * attr.rate);
    orders.push({
      slug: attr.slug, created, product, session: s.id, currency: (s.currency || "usd").toUpperCase(),
      gross_cents: gross, discount_cents: attr.discount_cents, fee_cents: fee, refunded_cents: refunded, net_cents: net,
      rate: attr.rate, commission_cents: commission,
      status: refunded >= gross && gross > 0 ? "refunded" : refunded > 0 ? "partial-refund" : "paid",
      buyer_email: (s.customer_details && s.customer_details.email) || "",
    });
  }
  const result = { month, computed_at: new Date().toISOString(), orders, reviews };
  await cacheStore().setJSON(cacheKey, result).catch(() => {});
  return result;
}

// Per-slug rollup across every program month.
async function allEarnings(stripe, { fresh = false } = {}) {
  const months = monthsSinceStart();
  const results = [];
  for (const m of months) results.push(await monthEarnings(stripe, m, { fresh: fresh && m === monthKey(new Date()) }));
  const bySlug = {};
  const bucket = (slug) => (bySlug[slug] = bySlug[slug] || { months: {}, lifetime_commission_cents: 0, lifetime_orders: 0, review_redeemed_at: "" });
  for (const r of results) {
    for (const o of r.orders) {
      const b = bucket(o.slug);
      const mb = (b.months[r.month] = b.months[r.month] || { orders: 0, gross_cents: 0, net_cents: 0, commission_cents: 0 });
      mb.orders += 1; mb.gross_cents += o.gross_cents; mb.net_cents += o.net_cents; mb.commission_cents += o.commission_cents;
      if (o.status !== "refunded") b.lifetime_orders += 1;
      b.lifetime_commission_cents += o.commission_cents;
    }
    for (const v of r.reviews) {
      const b = bucket(v.slug);
      if (!b.review_redeemed_at || v.created < b.review_redeemed_at) b.review_redeemed_at = v.created;
    }
  }
  return { months, results, bySlug };
}

function paidTotal(rec) {
  return (rec.payouts || []).reduce((n, p) => n + (Number(p.amount_cents) || 0), 0);
}

// Commission for closed months only - what is actually due for payout now.
function dueSummary(rec, slugEarnings) {
  const current = monthKey(new Date());
  const months = (slugEarnings && slugEarnings.months) || {};
  let closed = 0;
  for (const [m, v] of Object.entries(months)) if (m < current) closed += v.commission_cents;
  const thisMonth = (months[current] && months[current].commission_cents) || 0;
  const paid = paidTotal(rec);
  return { closed_commission_cents: closed, this_month_commission_cents: thisMonth, paid_cents: paid, owed_now_cents: Math.max(0, closed - paid) };
}

module.exports = {
  PROGRAM, PROGRAM_START, AUDIENCE_PERCENT, COMMISSION, STATUSES,
  slugify, audienceCodeFor, reviewCodeFor, monthKey, monthsSinceStart,
  getCreator, saveCreator, listCreators, newCreator, rotatePortalToken, creatorForToken,
  listApplications, setApplicationStatus,
  mintCodes, syncFromStripe, codeState, resolveBundleProduct,
  monthEarnings, allEarnings, dueSummary, paidTotal,
};
