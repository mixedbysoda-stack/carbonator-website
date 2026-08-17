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

module.exports = { syncLeadToGoogleSheets };
