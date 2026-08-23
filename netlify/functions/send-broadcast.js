// send-broadcast.js — campaign sender, routed through Resend Broadcasts.
//
// Replaces the transactional-API path in send-campaign.js. Marketing sends are
// metered by CONTACT COUNT, not by emails sent, and never consume the
// transactional daily quota — so a blast can no longer starve licence delivery.
// (2026-08-23: the 273-recipient TALLBOY blast ate the whole daily allowance
// and the next customer's licence email failed silently.)
//
// Usage:
//   POST /.netlify/functions/send-broadcast
//   Header: x-campaign-secret: <CAMPAIGN_SEND_SECRET>
//   Body: {
//     "subject": "TALLBOY is out",
//     "variant": "spotlight",          // passed to buildEmail()
//     "tokens":  { ... },              // passed to buildEmail()
//     "to":      ["a@x.com", ...],     // addresses to put in the segment
//     "name":    "TALLBOY launch",     // optional broadcast name
//     "segment": "General",            // optional segment name, default General
//     "dryRun":  true,                 // render + report, create nothing
//     "send":    false,                // create only; must be true to deliver
//     "scheduledAt": "tomorrow at 10am",          // optional, requires send
//     "allowExtraRecipients": false    // see the segment-drift guard below
//   }
//
// TWO-STEP BY DESIGN: with send:false (the default) this creates the broadcast
// and returns its id and dashboard URL so it can be previewed. Nothing is
// delivered until a call with send:true. The old sender fired immediately.
//
// SEGMENT DRIFT GUARD: a broadcast goes to EVERY contact in the segment, not
// just the addresses in `to`. If the segment already holds people who are not
// on the list, this refuses to send unless allowExtraRecipients is true — so
// nobody gets mail by accident because a segment was reused.

const crypto = require("crypto");
const { buildEmail } = require("../../email-templates/render.js");
const { isSuppressedAsync } = require("./lib/suppression.js");
const {
  ensureSegment,
  segmentContactEmails,
  syncContacts,
  createBroadcast,
  sendBroadcast,
} = require("./lib/broadcast.js");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const REPLY_TO = "mixedbysoda@gmail.com";
const DEFAULT_SEGMENT = "General";

function timingSafeEq(a, b) {
  const ab = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

const json = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });

  const secret = process.env.CAMPAIGN_SEND_SECRET;
  if (!secret) {
    console.error("CAMPAIGN_SEND_SECRET not configured");
    return json(500, { error: "Not configured" });
  }
  const provided =
    event.headers["x-campaign-secret"] || event.headers["X-Campaign-Secret"];
  if (!timingSafeEq(provided, secret)) return json(401, { error: "Unauthorized" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const {
    subject,
    variant,
    tokens,
    to,
    name,
    segment = DEFAULT_SEGMENT,
    dryRun = false,
    send = false,
    scheduledAt,
    allowExtraRecipients = false,
  } = body;

  if (!subject || !variant || !tokens) {
    return json(400, { error: "subject, variant and tokens are required" });
  }
  if (!Array.isArray(to) || to.length === 0) {
    return json(400, { error: "to must be a non-empty array of emails" });
  }

  // Render first — a template error should never leave a half-built campaign.
  let html;
  try {
    html = buildEmail(variant, tokens);
  } catch (err) {
    return json(400, { error: `Render failed: ${err.message}` });
  }

  // Suppression is enforced here as well as by Resend's own unsubscribe list.
  const intended = [];
  const suppressed = [];
  const seen = new Set();
  for (const raw of to) {
    const email = String(raw || "").trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    if (await isSuppressedAsync(email)) suppressed.push(email);
    else intended.push(email);
  }
  if (intended.length === 0) {
    return json(400, { error: "every recipient was suppressed or invalid", suppressed });
  }

  if (dryRun) {
    return json(200, {
      dryRun: true,
      wouldAddToSegment: intended.length,
      suppressed,
      htmlBytes: html.length,
      subject,
      segment,
    });
  }

  try {
    const seg = await ensureSegment(segment);

    const before = await segmentContactEmails(seg.id);
    const strangers = [...before].filter((e) => !seen.has(e));

    const sync = await syncContacts(seg.id, intended);

    if (strangers.length > 0 && !allowExtraRecipients) {
      return json(409, {
        error: "segment contains contacts that are not in your recipient list",
        segment: seg.name,
        segmentId: seg.id,
        strangerCount: strangers.length,
        strangers: strangers.slice(0, 25),
        hint:
          "A broadcast goes to every contact in the segment. Re-send with " +
          "allowExtraRecipients:true to include them, or use a dedicated segment.",
        contactsSynced: sync,
      });
    }

    const broadcast = await createBroadcast({
      name: name || subject,
      segmentId: seg.id,
      from: FROM_EMAIL,
      subject,
      html,
      replyTo: REPLY_TO,
    });

    if (!send) {
      return json(200, {
        created: true,
        sent: false,
        broadcastId: broadcast.id,
        dashboard: `https://resend.com/broadcasts/${broadcast.id}`,
        segment: seg.name,
        recipients: (await segmentContactEmails(seg.id)).size,
        contactsSynced: sync,
        suppressed,
        note: "Review it, then call again with send:true (and this broadcastId) to deliver.",
      });
    }

    const result = await sendBroadcast(broadcast.id, scheduledAt);
    return json(200, {
      created: true,
      sent: true,
      scheduledAt: scheduledAt || null,
      broadcastId: broadcast.id,
      dashboard: `https://resend.com/broadcasts/${broadcast.id}`,
      segment: seg.name,
      recipients: (await segmentContactEmails(seg.id)).size,
      contactsSynced: sync,
      suppressed,
      result,
    });
  } catch (err) {
    console.error("send-broadcast failed:", err.message);
    return json(502, { error: err.message });
  }
};
