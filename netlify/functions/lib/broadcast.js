// Resend Broadcasts (marketing) API.
//
// WHY THIS EXISTS: send-campaign.js sends campaigns through the TRANSACTIONAL
// email API, in batches of 100. On 2026-08-23 the 273-recipient TALLBOY blast
// consumed the entire daily transactional quota, and every licence-delivery
// email for the rest of the day failed. A paying customer got no key.
//
// Resend meters marketing separately: Broadcasts are limited by CONTACT count,
// not by emails sent, and they do not touch the transactional daily allowance.
// Routing campaigns here means a blast can never again starve licence delivery.
//
// The installed SDK (resend 3.5.0) exposes audiences and contacts but not
// broadcasts, so this calls the REST API directly — same approach as
// lib/stripe-session.js.
//
// NOTE ON NAMING: Resend renamed Audiences to Segments. /audiences still works
// as an alias, but /segments is the current spelling and is what we use.

const API = "https://api.resend.com";

function key() {
  const k = process.env.RESEND_API_KEY;
  if (!k) throw new Error("RESEND_API_KEY not configured");
  return k;
}

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON body — fall through to the status check */
  }

  if (!res.ok) {
    const err = new Error(
      `Resend ${method} ${path} failed (${res.status}): ${
        (json.error && (json.error.message || json.error)) || json.message || text.slice(0, 200)
      }`
    );
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

/** List every segment (formerly "audience") on the account. */
async function listSegments() {
  const out = await call("GET", "/segments");
  return out.data || [];
}

/** Find a segment by exact name, or create it. Returns the segment object. */
async function ensureSegment(name) {
  const existing = (await listSegments()).find((s) => s.name === name);
  if (existing) return existing;
  return call("POST", "/segments", { name });
}

/** Contacts already in a segment, lowercased. */
async function segmentContactEmails(segmentId) {
  const out = await call("GET", `/segments/${segmentId}/contacts`);
  return new Set((out.data || []).map((c) => String(c.email || "").toLowerCase()));
}

/**
 * Ensure `emails` are contacts inside `segmentId`.
 * Idempotent: addresses already in the segment are skipped, and an "already
 * exists" response from Resend is treated as success rather than an error.
 * Returns { added, skipped, failed: [{email, error}] }.
 */
async function syncContacts(segmentId, emails) {
  const already = await segmentContactEmails(segmentId);
  const result = { added: 0, skipped: 0, failed: [] };

  for (const raw of emails) {
    const email = String(raw || "").trim().toLowerCase();
    if (!email) continue;
    if (already.has(email)) {
      result.skipped++;
      continue;
    }
    try {
      await call("POST", `/segments/${segmentId}/contacts`, {
        email,
        unsubscribed: false,
      });
      result.added++;
      already.add(email);
    } catch (err) {
      // A duplicate is not a failure — the contact is in the segment either way.
      if (/already|exists|duplicate/i.test(err.message)) {
        result.skipped++;
        already.add(email);
      } else {
        result.failed.push({ email, error: err.message });
      }
    }
  }
  return result;
}

/**
 * Create a broadcast. Does NOT send it — call sendBroadcast() for that, so a
 * mistake is recoverable right up until the moment of sending.
 */
async function createBroadcast({ name, segmentId, from, subject, html, text, replyTo, previewText }) {
  if (!segmentId) throw new Error("segmentId is required");
  if (!from || !subject) throw new Error("from and subject are required");
  if (!html && !text) throw new Error("one of html or text is required");

  const body = { name: name || subject, segment_id: segmentId, from, subject };
  if (html) body.html = html;
  if (text) body.text = text;
  if (replyTo) body.reply_to = Array.isArray(replyTo) ? replyTo : [replyTo];
  if (previewText) body.preview_text = previewText;

  return call("POST", "/broadcasts", body);
}

/** Send (or schedule) an existing broadcast. */
async function sendBroadcast(broadcastId, scheduledAt) {
  if (!broadcastId) throw new Error("broadcastId is required");
  return call(
    "POST",
    `/broadcasts/${broadcastId}/send`,
    scheduledAt ? { scheduled_at: scheduledAt } : {}
  );
}

module.exports = {
  listSegments,
  ensureSegment,
  segmentContactEmails,
  syncContacts,
  createBroadcast,
  sendBroadcast,
};
