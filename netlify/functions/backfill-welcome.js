// backfill-welcome.js — one-off repair endpoint for leads parked at
// drip_status "email1_pending".
//
// WHAT THAT STATE MEANS: capture-lead.js writes the lead with
// drip_status "email1_pending", sends the welcome email, and only then flips
// the status to "email1_sent". Until 2026-08-23 the Resend SDK's { data, error }
// result was never inspected (see lib/mailer.js), so a refused send looked like
// a success — but the status write sits after the send inside the same try
// block, so a genuinely failed send left the lead stuck at "email1_pending".
//
// That state is a dead end: drip-day3.js only picks up leads at "email1_sent",
// so a stranded lead is excluded from the entire nurture sequence, forever.
//
// This endpoint re-sends the correct product welcome email to those leads and
// advances the status only after Resend confirms the send.
//
// Usage:
//   POST /.netlify/functions/backfill-welcome
//   Header: x-campaign-secret: <CAMPAIGN_SEND_SECRET>
//   Body: { "dryRun": true, "limit": 10, "startAfter": "<key>", "maxScan": 120 }
//   Returns { candidates, sent, wouldSend, suppressed, buyers, failed,
//             cursor, scanComplete, quotaHalted, budget }
//
// RESUMABILITY: a successful send flips the lead out of "email1_pending", so
// re-running can never send twice. `cursor` / `startAfter` page the scan so a
// single invocation stays inside the function timeout; `scanComplete` tells the
// caller when the store has been walked end to end.
//
// QUOTA: bounded by lib/send-quota.js — a small self-imposed per-UTC-day
// ceiling, recorded per send, so this can never eat the headroom that licence
// delivery needs. Any retryable Resend error (429 or 5xx) aborts the whole run
// immediately rather than pushing further against a strained account.

const crypto = require("crypto");
const { Resend } = require("resend");
const { getBlobStore } = require("./lib/store");
const { sendEmail } = require("./lib/mailer");
const { isSuppressedAsync } = require("./lib/suppression");
const { loadBuyerEmails } = require("./lib/buyers");
const { buildWelcome, productFromSource } = require("./lib/welcome-emails");
const { syncLeadStatusToGoogleSheets } = require("./lib/google-sheets");
const { readBackfillBudget, recordBackfillSend } = require("./lib/send-quota");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const PENDING_STATUS = "email1_pending";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;
// Blob reads are the cost here, not the sends. Measured against the live store
// on 2026-08-23: ~0.2s per record, so a full 398-record sweep takes ~80s — far
// past the 10s sync-function timeout. One invocation therefore reads a small
// window and hands back a cursor; the driver script loops.
const DEFAULT_MAX_SCAN = 40;
const MAX_MAX_SCAN = 100;
const DOWNLOAD_GRANT_TTL_MS = 48 * 60 * 60 * 1000;

function timingSafeEq(a, b) {
  const ab = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function productionOrigin() {
  return String(process.env.URL || "https://carbonatedaudio.com").replace(/\/$/, "");
}

// Still's welcome email is the one that is not self-contained: its button both
// confirms the inbox and downloads, so it needs a live grant. Mint a fresh one
// exactly the way capture-lead.js does.
async function mintStillConfirmUrl(leadKey, contact) {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await getBlobStore("still-downloads").setJSON(`dl_${tokenHash}`, {
    lead_key: leadKey,
    contact,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + DOWNLOAD_GRANT_TTL_MS).toISOString(),
    downloads: 0,
    backfilled: true,
  });
  return `${productionOrigin()}/.netlify/functions/verify-still-download?token=${encodeURIComponent(rawToken)}`;
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  }

  const secret = process.env.CAMPAIGN_SEND_SECRET;
  if (!secret) {
    console.error("CAMPAIGN_SEND_SECRET not configured");
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Not configured" }) };
  }
  const provided = event.headers["x-campaign-secret"] || event.headers["X-Campaign-Secret"];
  if (!timingSafeEq(provided, secret)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  // Default to a dry run. Sending is opt-in, never the fallback.
  const dryRun = body.dryRun !== false;
  const limit = Math.min(Math.max(Number(body.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const maxScan = Math.min(Math.max(Number(body.maxScan) || DEFAULT_MAX_SCAN, 1), MAX_MAX_SCAN);
  const startAfter = body.startAfter ? String(body.startAfter) : null;
  // Caller-supplied extra holds, on top of lib/suppression.js. The TALLBOY
  // blast holds mangow@web.de because the suppression list carries
  // mangor@web.de — one character away on the same domain — and mailing the
  // wrong one mails somebody who opted out. Carried through here for parity.
  const hold = new Set(
    (Array.isArray(body.hold) ? body.hold : []).map((e) => String(e).trim().toLowerCase()).filter(Boolean)
  );

  if (!dryRun && !process.env.RESEND_API_KEY) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: "RESEND_API_KEY is not configured" }) };
  }

  const budget = await readBackfillBudget();
  if (!dryRun && budget.remaining <= 0) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        quotaHalted: true,
        budget,
        sent: [],
        reason: budget.degraded
          ? "Send ledger unreadable — refusing to send rather than guess at remaining headroom."
          : `Daily backfill budget of ${budget.max} is spent. Resumes at 00:00 UTC.`,
      }),
    };
  }

  const store = getBlobStore("leads");
  let keys;
  try {
    const listed = await store.list();
    // Keys are `lead_<epochMs>_<rand>`, so lexical order is chronological and
    // stable — which is what makes `startAfter` a safe resume cursor.
    keys = (listed.blobs || []).map((b) => b.key).sort();
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: `Lead store list failed: ${err.message}` }) };
  }

  const startIndex = startAfter ? keys.findIndex((k) => k > startAfter) : 0;
  const from = startIndex < 0 ? keys.length : startIndex;

  // Bounded scan: one invocation reads at most `maxScan` records and collects
  // at most `limit` candidates, so it cannot run past the function timeout.
  const candidates = [];
  let scanned = 0;
  let cursor = startAfter;
  let index = from;
  for (; index < keys.length && scanned < maxScan && candidates.length < limit; index++) {
    const key = keys[index];
    cursor = key;
    scanned++;
    let lead;
    try {
      lead = await store.get(key, { type: "json" });
    } catch {
      continue;
    }
    if (!lead || !lead.contact) continue;
    if (lead.drip_status !== PENDING_STATUS) continue;
    candidates.push({ key, lead });
  }
  const scanComplete = index >= keys.length;

  const result = {
    dryRun,
    scanned,
    totalKeys: keys.length,
    cursor,
    scanComplete,
    candidates: candidates.length,
    sent: [],
    wouldSend: [],
    suppressed: [],
    buyers: [],
    held: [],
    needsVerification: [],
    failed: [],
    quotaHalted: false,
    budget,
  };

  if (!candidates.length) {
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  }

  // Only worth the Stripe round-trip once we know there is something to send.
  const buyerEmails = await loadBuyerEmails();
  const resend = dryRun ? null : new Resend(process.env.RESEND_API_KEY);
  let spentThisRun = 0;

  for (const { key, lead } of candidates) {
    const contact = String(lead.contact).trim().toLowerCase();

    if (hold.has(contact)) {
      result.held.push(contact);
      continue;
    }
    if (await isSuppressedAsync(contact)) {
      result.suppressed.push(contact);
      continue;
    }
    if (buyerEmails.has(contact)) {
      result.buyers.push(contact);
      continue;
    }
    // A lead awaiting inbox confirmation belongs to the verification flow, where
    // clicking the link — not this backfill — is what earns a drip place.
    // Advancing it here would smuggle an unconfirmed address into the sequence.
    if (lead.verification_status === "pending") {
      result.needsVerification.push(contact);
      continue;
    }

    // Budget check before anything is built or minted, so a lead that stops at
    // the ceiling is left completely untouched for the next run.
    if (!dryRun && spentThisRun >= budget.remaining) {
      result.quotaHalted = true;
      result.reason = `Stopped at the daily backfill budget (${budget.max}/day). Resumes at 00:00 UTC.`;
      break;
    }

    // Only Still needs a download grant, and only for a real send. Minting one
    // for every lead would litter the grant store with tokens nothing can use.
    const product = productFromSource(lead.source);
    let welcome;
    try {
      let stillConfirmUrl = null;
      if (product === "still") {
        stillConfirmUrl = dryRun
          ? `${productionOrigin()}/.netlify/functions/verify-still-download?token=DRY-RUN`
          : await mintStillConfirmUrl(key, contact);
      }
      welcome = buildWelcome({ source: lead.source, stillConfirmUrl });
    } catch (err) {
      result.failed.push({ email: contact, error: `Render failed: ${err.message}` });
      continue;
    }

    if (dryRun) {
      result.wouldSend.push({ email: contact, product: welcome.product, subject: welcome.subject });
      continue;
    }

    try {
      await sendEmail(resend, {
        from: FROM_EMAIL,
        reply_to: "mixedbysoda@gmail.com",
        to: contact,
        subject: welcome.subject,
        html: welcome.html,
      });
    } catch (err) {
      result.failed.push({ email: contact, error: err.message, retryable: Boolean(err.retryable) });
      // A 429 or 5xx means the account is under pressure. Stop the entire run
      // rather than spend the rest of the batch discovering the same thing —
      // the lead stays at "email1_pending" and the next run picks it up.
      if (err.retryable) {
        result.quotaHalted = true;
        result.reason = "Resend returned a retryable error — aborting the run to protect transactional headroom.";
        break;
      }
      continue;
    }

    // The send is confirmed from here down. Ledger first: if the ledger write
    // fails we must stop, because the budget would silently stop advancing.
    try {
      await recordBackfillSend();
      spentThisRun++;
    } catch (err) {
      result.failed.push({ email: contact, error: `Sent, but the send ledger write failed: ${err.message}` });
      result.quotaHalted = true;
      result.reason = "Send ledger write failed — stopping so the daily budget cannot be overrun.";
      break;
    }

    const now = new Date().toISOString();
    try {
      await store.setJSON(key, {
        ...lead,
        drip_status: "email1_sent",
        email1_sent_at: now,
        welcome_sent_at: now,
        email1_backfilled_at: now,
      });
      await syncLeadStatusToGoogleSheets({ ...lead, drip_status: "email1_sent" }).catch((err) =>
        console.error(`Sheet status sync failed for ${contact} (non-fatal):`, err.message)
      );
      result.sent.push({ email: contact, product: welcome.product });
    } catch (err) {
      // Delivered but not recorded. Say so loudly: a re-run would send again.
      result.failed.push({
        email: contact,
        error: `DELIVERED but status write failed — will re-send on the next run: ${err.message}`,
      });
    }
  }

  result.budgetAfter = { ...budget, used: budget.used + spentThisRun, remaining: Math.max(0, budget.remaining - spentThisRun) };
  return { statusCode: 200, headers, body: JSON.stringify(result) };
};
