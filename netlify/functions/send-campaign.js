// send-campaign.js - authenticated outbound campaign sender (v2, batch mode).
//
// Why this exists: Gmail-connector sends strip <img> tags, so branded emails
// (logo + product hero) must go out through Resend like the purchase emails do.
// This also enforces the suppression list in code on every single recipient.
//
// v2: the v1 per-email loop paced at 600ms per recipient, which meant a
// 100-recipient batch needed 60+ seconds - past the synchronous function
// timeout. It got killed mid-batch on 2026-08-22 (89 of 100 sent). v2 sends
// each batch as ONE Resend batch API call (up to 100 emails per call), which
// completes in a couple of seconds. No pacing loop, nothing to time out.
//
// Usage:
//   POST /.netlify/functions/send-campaign
//   Header: x-campaign-secret: <CAMPAIGN_SEND_SECRET>
//   Body: {
//     "subject": "TALLBOY is out",
//     "variant": "spotlight",            // personal | spotlight | bundle | support
//     "tokens": { ... },                 // passed straight to buildEmail()
//     "to": ["a@x.com", "b@y.com"],     // explicit recipient list, 1-100
//     "dryRun": true                     // optional: validate + render, send nothing
//   }
//   Returns { sent: [...], suppressed: [...], failed: [{email, error}], dryRun? }
//
// Setup (one time): set CAMPAIGN_SEND_SECRET in Netlify env vars, deploy.
// RESEND_API_KEY is already configured for stripe-webhook.js.

const crypto = require("crypto");
const { Resend } = require("resend");
const { buildEmail } = require("../../email-templates/render.js");
const { isSuppressedAsync } = require("./lib/suppression.js");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const MAX_RECIPIENTS = 100; // also the Resend batch-endpoint limit per call

function timingSafeEq(a, b) {
  const ab = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };
  }

  const secret = process.env.CAMPAIGN_SEND_SECRET;
  if (!secret) {
    console.error("CAMPAIGN_SEND_SECRET not configured");
    return { statusCode: 500, body: JSON.stringify({ error: "Not configured" }) };
  }
  const provided = event.headers["x-campaign-secret"] || event.headers["X-Campaign-Secret"];
  if (!timingSafeEq(provided, secret)) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { subject, variant, tokens, to, dryRun } = body;
  if (!subject || !variant || !tokens) {
    return { statusCode: 400, body: JSON.stringify({ error: "subject, variant, tokens are required" }) };
  }
  if (!Array.isArray(to) || to.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "to must be a non-empty array of emails" }) };
  }
  if (to.length > MAX_RECIPIENTS) {
    return { statusCode: 400, body: JSON.stringify({ error: `Max ${MAX_RECIPIENTS} recipients per call` }) };
  }

  let html;
  try {
    html = buildEmail(variant, tokens);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: `Render failed: ${err.message}` }) };
  }

  // Resolve suppression for every address before sending anything.
  const checks = await Promise.all(
    to.map(async (email) => ({ email, blocked: await isSuppressedAsync(email) }))
  );
  const eligible = checks.filter((c) => !c.blocked).map((c) => c.email);
  const suppressed = checks.filter((c) => c.blocked).map((c) => c.email);

  if (dryRun) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        dryRun: true,
        v: 2,
        wouldSend: eligible,
        suppressed,
        htmlBytes: html.length,
      }),
    };
  }

  const sent = [];
  const failed = [];

  // DEPRECATED FOR CAMPAIGNS — this sends through the TRANSACTIONAL API, which
  // shares the account's daily quota with licence-key delivery. On 2026-08-23 a
  // 273-recipient blast through here consumed the entire day's allowance and the
  // next customer's licence email failed silently. Campaigns belong in
  // send-broadcast.js, which uses Resend Broadcasts: metered by contact count,
  // never touches the transactional quota.
  const BULK_THRESHOLD = 25;
  if (eligible.length > BULK_THRESHOLD && !body.forceTransactional) {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: `Refusing to send ${eligible.length} emails through the transactional API.`,
        why:
          "This shares the daily quota with licence-key delivery. A blast this " +
          "size can stop paying customers receiving their keys.",
        use: "/.netlify/functions/send-broadcast",
        override:
          "Set forceTransactional:true only if you are certain the quota can absorb it.",
      }),
    };
  }

  if (eligible.length > 0) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const payload = eligible.map((email) => ({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    }));
    try {
      // One API call for the whole batch - completes in seconds.
      const { error } = await resend.batch.send(payload);
      if (error) {
        console.error("send-campaign batch error:", error.message || JSON.stringify(error));
        for (const email of eligible) failed.push({ email, error: error.message || "batch error" });
      } else {
        sent.push(...eligible);
      }
    } catch (err) {
      console.error("send-campaign batch threw:", err.message);
      for (const email of eligible) failed.push({ email, error: err.message });
    }
  }

  console.log(`send-campaign v2: ${sent.length} sent, ${suppressed.length} suppressed, ${failed.length} failed`);
  return { statusCode: 200, body: JSON.stringify({ v: 2, sent, suppressed, failed }) };
};
