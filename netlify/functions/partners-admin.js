// SODA's creator/partner board API. Backs /partners-admin.
//
// Auth: x-admin-token header = LEADS_ADMIN_TOKEN (same token as the other
// admin endpoints). Header only, never a query param, so the token does not
// end up in Netlify request logs or browser history.
//
//   GET  ?action=board                  creators + applications + earnings rollup
//   GET  ?action=month&month=YYYY-MM    every creator order in that month (with buyer email, admin only)
//   POST {action:"sync"}                pull creator-2026 codes from Stripe into records
//   POST {action:"approve", application_key, slug, name}   mint codes + record + portal link
//   POST {action:"decline", application_key}
//   POST {action:"update", slug, fields:{status,email,paypal_email,notes,name,channel_url,platform}}
//   POST {action:"payout", slug, amount, period, reference, note}
//   POST {action:"delete_payout", slug, id}
//   POST {action:"rotate_link", slug}   new portal link, old one stops working
//   POST {action:"refresh"}             recompute the current month now
const crypto = require("crypto");
const Stripe = require("stripe");
const C = require("./lib/creators");

const SITE = "https://carbonatedaudio.com";

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}

function authed(event) {
  const expected = process.env.LEADS_ADMIN_TOKEN || "";
  const got = String((event.headers && (event.headers["x-admin-token"] || event.headers["X-Admin-Token"])) || "");
  if (!expected || !got) return false;
  const a = Buffer.from(sha(got));
  const b = Buffer.from(sha(expected));
  return crypto.timingSafeEqual(a, b);
}
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
const isEmail = (v) => !v || (v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v));
const portalUrl = (token) => `${SITE}/partner?t=${token}`;

function welcomeBlock(rec, bundleUrl, link) {
  return [
    `Your code for your audience: ${rec.audience_code} (${C.AUDIENCE_PERCENT}% off anything at carbonatedaudio.com, 12 months)`,
    `Your free All 7 license: go to ${bundleUrl} and enter ${rec.review_code} at checkout (one use, expires ${rec.review_expires})`,
    `Your partner page (sales, commission, payouts): ${link}`,
  ].join("\n");
}

exports.handler = async (event) => {
  if (!authed(event)) return json(401, { error: "Unauthorized" });
  if (!process.env.STRIPE_SECRET_KEY) return json(500, { error: "STRIPE_SECRET_KEY is not set" });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    if (event.httpMethod === "GET") {
      const q = event.queryStringParameters || {};
      if (q.action === "month") {
        const month = /^\d{4}-\d{2}$/.test(q.month || "") ? q.month : C.monthKey(new Date());
        return json(200, await C.monthEarnings(stripe, month));
      }
      // board
      const [creators, applications, earnings] = await Promise.all([C.listCreators(), C.listApplications(), C.allEarnings(stripe)]);
      const rows = await Promise.all(creators.map(async (rec) => {
        const e = earnings.bySlug[rec.slug];
        const { portal_token_hash, ...safe } = rec;
        return {
          ...safe,
          has_portal_link: Boolean(portal_token_hash),
          codes: await C.codeState(stripe, rec),
          earnings: e || { months: {}, lifetime_commission_cents: 0, lifetime_orders: 0, review_redeemed_at: "" },
          due: C.dueSummary(rec, e),
        };
      }));
      const known = new Set(creators.map((c) => c.slug));
      const orphanSlugs = Object.keys(earnings.bySlug).filter((s) => !known.has(s));
      return json(200, {
        months: earnings.months,
        current_month: C.monthKey(new Date()),
        creators: rows,
        applications: applications.map(({ key, name, email, platform, channel_url, audience, plugin, note, submitted_at, status, creator_slug }) =>
          ({ key, name, email, platform, channel_url, audience, plugin, note, submitted_at, status: status || "new", creator_slug: creator_slug || "" })),
        unlinked_earnings: orphanSlugs,
      });
    }

    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
    let body;
    try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON" }); }

    switch (body.action) {
      case "sync": {
        return json(200, { ok: true, ...(await C.syncFromStripe(stripe)) });
      }

      case "refresh": {
        await C.monthEarnings(stripe, C.monthKey(new Date()), { fresh: true });
        return json(200, { ok: true });
      }

      case "approve": {
        const apps = await C.listApplications();
        const app = apps.find((a) => a.key === body.application_key);
        if (!app) return json(404, { error: "Application not found" });
        const slug = C.slugify(body.slug || app.name);
        if (!slug) return json(400, { error: "Slug is empty" });
        let rec = await C.getCreator(slug);
        if (rec && rec.application_key && rec.application_key !== app.key) {
          return json(409, { error: `Slug "${slug}" already belongs to ${rec.name}. Pick another slug.` });
        }
        rec = rec || C.newCreator({ slug, name: clip(body.name, 80) || app.name, email: app.email, platform: app.platform, channel_url: app.channel_url, application_key: app.key });
        const { bundle } = await C.mintCodes(stripe, rec);
        await C.saveCreator(rec);
        const token = await C.rotatePortalToken(rec);
        await C.setApplicationStatus(app.key, "approved", { creator_slug: slug });
        return json(200, {
          ok: true, slug,
          portal_link: portalUrl(token),
          bundle_url: bundle.url,
          promo_codes_enabled_on_bundle_link: bundle.allowPromo,
          welcome_block: welcomeBlock(rec, bundle.url, portalUrl(token)),
        });
      }

      case "decline": {
        const app = await C.setApplicationStatus(clip(body.application_key, 200), "declined");
        if (!app) return json(404, { error: "Application not found" });
        return json(200, { ok: true });
      }

      case "update": {
        const rec = await C.getCreator(C.slugify(body.slug));
        if (!rec) return json(404, { error: "Creator not found" });
        const f = body.fields || {};
        if (f.status !== undefined) {
          if (!C.STATUSES.includes(f.status)) return json(400, { error: `status must be one of ${C.STATUSES.join(", ")}` });
          rec.status = f.status;
        }
        for (const [k, n] of [["name", 80], ["platform", 20], ["channel_url", 300], ["notes", 4000]]) if (f[k] !== undefined) rec[k] = clip(f[k], n);
        for (const k of ["email", "paypal_email"]) {
          if (f[k] === undefined) continue;
          const v = clip(f[k], 254).toLowerCase();
          if (!isEmail(v)) return json(400, { error: `${k} is not a valid email` });
          rec[k] = v;
        }
        await C.saveCreator(rec);
        return json(200, { ok: true });
      }

      case "payout": {
        const rec = await C.getCreator(C.slugify(body.slug));
        if (!rec) return json(404, { error: "Creator not found" });
        const amount = Math.round(Number(body.amount) * 100);
        if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) return json(400, { error: "Amount must be a positive dollar amount" });
        const period = /^\d{4}-\d{2}$/.test(body.period || "") ? body.period : "";
        rec.payouts = rec.payouts || [];
        rec.payouts.push({
          id: crypto.randomBytes(6).toString("hex"),
          amount_cents: amount,
          period,
          paid_at: new Date().toISOString(),
          method: "paypal",
          reference: clip(body.reference, 120),
          note: clip(body.note, 300),
        });
        await C.saveCreator(rec);
        return json(200, { ok: true });
      }

      case "delete_payout": {
        const rec = await C.getCreator(C.slugify(body.slug));
        if (!rec) return json(404, { error: "Creator not found" });
        const before = (rec.payouts || []).length;
        rec.payouts = (rec.payouts || []).filter((p) => p.id !== body.id);
        if (rec.payouts.length === before) return json(404, { error: "Payout not found" });
        await C.saveCreator(rec);
        return json(200, { ok: true });
      }

      case "rotate_link": {
        const rec = await C.getCreator(C.slugify(body.slug));
        if (!rec) return json(404, { error: "Creator not found" });
        const token = await C.rotatePortalToken(rec);
        return json(200, { ok: true, portal_link: portalUrl(token) });
      }

      default:
        return json(400, { error: "Unknown action" });
    }
  } catch (err) {
    console.error("partners-admin:", err && err.stack ? err.stack : err);
    return json(500, { error: err.message || "Server error" });
  }
};
