// send-campaign.js - authenticated outbound campaign sender.
//
// Why this exists: Gmail-connector sends strip <img> tags, so branded emails
// (logo + product hero) must go out through Resend like the purchase emails do.
// This also enforces the suppression list in code on every single recipient.
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
const MAX_RECIPIENTS = 100;

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

  const sent = [];
  const suppressed = [];
  const failed = [];

  // Resolve suppression for every address before sending anything.
  const checks = await Promise.all(
    to.map(async (email) => ({ email, blocked: await isSuppressedAsync(email) }))
  );

  if (dryRun) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        dryRun: true,
        wouldSend: checks.filter((c) => !c.blocked).map((c) => c.email),
        suppressed: checks.filter((c) => c.blocked).map((c) => c.email),
        htmlBytes: html.length,
      }),
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  for (const { email, blocked } of checks) {
    if (blocked) {
      suppressed.push(email);
      continue;
    }
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
      });
      sent.push(email);
    } catch (err) {
      console.error(`send-campaign failed for ${email}:`, err.message);
      failed.push({ email, error: err.message });
    }
    // Gentle pacing - stays far under Resend rate limits.
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`send-campaign: ${sent.length} sent, ${suppressed.length} suppressed, ${failed.length} failed`);
  return { statusCode: 200, body: JSON.stringify({ sent, suppressed, failed }) };
};
