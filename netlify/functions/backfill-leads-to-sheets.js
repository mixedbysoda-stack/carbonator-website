const { getBlobStore } = require("./lib/store");
const { syncLeadToGoogleSheets } = require("./lib/google-sheets");

// This endpoint used to replay events directly into the Apps Script upsert.
// That script correctly avoids duplicate *rows*, but increments Lead Count on
// every replay, so retrying a batch can inflate event totals. The master Sheet
// was reconciled directly from Netlify Blobs on Aug 17, 2026. Keep this route
// unavailable until the Apps Script accepts a durable event id.
exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };
  const queryToken = event.queryStringParameters?.token;
  const authorization = event.headers?.authorization || event.headers?.Authorization || "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const token = bearerToken || queryToken;

  if (!process.env.LEADS_ADMIN_TOKEN || token !== process.env.LEADS_ADMIN_TOKEN) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  if (!process.env.GOOGLE_SHEETS_WEB_APP_URL || !process.env.GOOGLE_SHEETS_SYNC_TOKEN) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: "Google Sheets sync is not configured" }) };
  }

  // Admin-only, non-mutating connection check. The Apps Script validates the
  // shared token before rejecting the intentionally blank contact, so this
  // confirms the live Netlify runtime can authenticate without creating a
  // lead, incrementing a count, or sending an email.
  if (event.queryStringParameters?.mode === "verify") {
    try {
      const response = await fetch(process.env.GOOGLE_SHEETS_WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_token: process.env.GOOGLE_SHEETS_SYNC_TOKEN, contact: "" }),
      });
      const result = await response.json().catch(() => null);
      const connected = response.ok && result?.error === "Missing contact";
      return {
        statusCode: connected ? 200 : 502,
        headers,
        body: JSON.stringify({ connected }),
      };
    } catch (err) {
      console.error("Google Sheets sync verification failed:", err.message);
      return { statusCode: 502, headers, body: JSON.stringify({ connected: false }) };
    }
  }

  return {
    statusCode: 409,
    headers,
    body: JSON.stringify({
      error: "Backfill is disabled to protect lead-event counts. Reconcile from Netlify Blobs after deploying an event-id-aware Apps Script.",
    }),
  };

  /*
  try {
    const store = getBlobStore("leads");
    const result = await store.list();
    const blobs = result.blobs || [];
    const leads = await Promise.all(
      blobs.map(async ({ key }) => {
        try {
          return await store.get(key, { type: "json" });
        } catch {
          return null;
        }
      })
    );

    const validLeads = leads
      .filter((lead) => lead?.contact && lead?.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const requestedLimit = Number(event.queryStringParameters?.limit);
    const requestedOffset = Number(event.queryStringParameters?.offset);
    const offset = Number.isInteger(requestedOffset) && requestedOffset > 0 ? requestedOffset : 0;
    const leadsToSync = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? validLeads.slice(offset, offset + Math.min(requestedLimit, validLeads.length))
      : validLeads;
    const leadGroups = new Map();
    for (const lead of leadsToSync) {
      const key = lead.contact.trim().toLowerCase();
      const group = leadGroups.get(key) || [];
      group.push(lead);
      leadGroups.set(key, group);
    }

    let synced = 0;
    let failed = 0;
    const groups = [...leadGroups.values()];
    let nextGroup = 0;
    const worker = async () => {
      while (nextGroup < groups.length) {
        const group = groups[nextGroup++];
        for (const lead of group) {
          try {
            const result = await syncLeadToGoogleSheets(lead);
            if (result.synced) synced += 1;
            else failed += 1;
          } catch (err) {
            failed += 1;
            console.error("Lead backfill sync failed:", err.message);
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(8, groups.length) }, worker));

    return {
      statusCode: failed ? 207 : 200,
      headers,
      body: JSON.stringify({ total: leadsToSync.length, synced, failed, offset }),
    };
  } catch (err) {
    console.error("Lead backfill failed:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Backfill failed" }) };
  }
  */
};
