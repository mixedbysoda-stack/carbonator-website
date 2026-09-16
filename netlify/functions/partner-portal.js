// A creator's private partner page data. Backs /partner?t=<token>.
//
// The token is the only credential: 24 random bytes, stored as a sha256 hash,
// rotatable from the admin board. Nothing here identifies a buyer - orders are
// shown as date, product and commission only.
const Stripe = require("stripe");
const C = require("./lib/creators");

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  const token = String((event.queryStringParameters && event.queryStringParameters.t) || "");
  const rec = await C.creatorForToken(token).catch(() => null);
  // Same response for a bad, rotated or ended link: no hint about which.
  if (!rec || rec.status === "ended") return json(404, { error: "This partner link is not valid. Ask Soda for a new one." });
  if (!process.env.STRIPE_SECRET_KEY) return json(500, { error: "Temporarily unavailable" });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const [earnings, codes] = await Promise.all([C.allEarnings(stripe), C.codeState(stripe, rec)]);
    const e = earnings.bySlug[rec.slug] || { months: {}, lifetime_commission_cents: 0, lifetime_orders: 0, review_redeemed_at: "" };
    const current = C.monthKey(new Date());
    const orders = [];
    for (const r of earnings.results) {
      for (const o of r.orders) {
        if (o.slug !== rec.slug) continue;
        orders.push({ date: o.created.slice(0, 10), product: o.product, gross_cents: o.gross_cents, commission_cents: o.commission_cents, status: o.status });
      }
    }
    orders.sort((a, b) => b.date.localeCompare(a.date));

    return json(200, {
      name: rec.name,
      status: rec.status,
      audience_code: rec.audience_code,
      audience_percent: C.AUDIENCE_PERCENT,
      commission_percent: Math.round(Number(rec.commission_rate || C.COMMISSION) * 100),
      code_active: codes.audience_active,
      review_code: rec.review_code,
      review_expires: rec.review_expires,
      review_redeemed: codes.review_redeemed,
      paypal_on_file: Boolean(rec.paypal_email),
      current_month: current,
      months: earnings.months.slice().reverse().map((m) => ({ month: m, ...(e.months[m] || { orders: 0, gross_cents: 0, net_cents: 0, commission_cents: 0 }) })),
      lifetime_orders: e.lifetime_orders,
      lifetime_commission_cents: e.lifetime_commission_cents,
      due: C.dueSummary(rec, e),
      payouts: (rec.payouts || []).map(({ amount_cents, period, paid_at }) => ({ amount_cents, period, paid_at: paid_at.slice(0, 10) })).reverse(),
      orders: orders.slice(0, 100),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("partner-portal:", err && err.stack ? err.stack : err);
    return json(500, { error: "Could not load your numbers right now. Try again in a minute." });
  }
};
