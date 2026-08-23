const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Mirrors a lead to the owner-controlled Google Sheet.
 *
 * Netlify Blobs remains the system of record. This intentionally returns a
 * result instead of throwing so a Google outage can never block a download or
 * the welcome-email flow.
 */
async function syncLeadToGoogleSheets(lead) {
  const endpoint = process.env.GOOGLE_SHEETS_WEB_APP_URL;
  const token = process.env.GOOGLE_SHEETS_SYNC_TOKEN;

  if (!endpoint || !token) {
    return { skipped: true, reason: "Google Sheets sync is not configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, sync_token: token }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Google Sheets returned ${response.status}`);
    }

    const result = await response.json().catch(() => null);
    if (!result?.success) {
      throw new Error(`Google Sheets rejected the sync: ${result?.error || "invalid response"}`);
    }

    return { synced: true };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Pushes a lead's CURRENT drip_status to the Sheet, and nothing else.
 *
 * The normal sync is deduped on event_id, so it can only ever record the status
 * a lead had at capture time — "email1_pending", written before the welcome
 * email is even attempted. Every later transition (email1_sent, email2_sent,
 * email3_sent) was invisible to the Sheet, which is how 59 fully-nurtured leads
 * came to look permanently stranded in an export on 2026-08-23.
 *
 * Requires the `status_update` branch in google-sheets-backup/Code.gs. Against
 * an Apps Script deployment that predates it, the request falls through to the
 * normal upsert path — which would inflate Lead Count — so this sends
 * `event_id` too: an already-synced lead is rejected as a duplicate there
 * rather than double-counted. Callers must treat failure as non-fatal; the
 * Sheet is a reporting view and Blobs remains the system of record.
 */
async function syncLeadStatusToGoogleSheets(lead) {
  const endpoint = process.env.GOOGLE_SHEETS_WEB_APP_URL;
  const token = process.env.GOOGLE_SHEETS_SYNC_TOKEN;

  if (!endpoint || !token) {
    return { skipped: true, reason: "Google Sheets sync is not configured" };
  }
  if (!lead || !lead.contact || !lead.drip_status) {
    return { skipped: true, reason: "Lead needs a contact and a drip_status" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status_update: true,
        contact: lead.contact,
        drip_status: lead.drip_status,
        event_id: lead.event_id,
        sync_token: token,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Google Sheets returned ${response.status}`);
    }

    const result = await response.json().catch(() => null);
    if (!result?.success) {
      throw new Error(`Google Sheets rejected the status sync: ${result?.error || "invalid response"}`);
    }

    return { synced: true, action: result.action };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { syncLeadToGoogleSheets, syncLeadStatusToGoogleSheets };
