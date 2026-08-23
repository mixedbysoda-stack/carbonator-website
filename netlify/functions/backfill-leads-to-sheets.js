const { getBlobStore } = require("./lib/store");
const { syncLeadToGoogleSheets, syncLeadStatusToGoogleSheets } = require("./lib/google-sheets");
const { furthestAlong } = require("./lib/drip-status");

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

  // STATUS RECONCILE --------------------------------------------------------
  // Repairs the Drip Status column without touching anything else. This is safe
  // to replay where the full backfill below is not: the Apps Script's
  // status_update path rewrites one cell, never increments Lead Count, and never
  // appends a row.
  //
  // Two phases, because getting this right needs global knowledge but each
  // invocation has to fit the function timeout:
  //
  //   mode=scan-status  — read a window of lead records, return {email: status}
  //                       for that window plus a cursor. The caller merges the
  //                       windows. This matters because one address can hold
  //                       several lead records (a repeat visitor), and the row
  //                       must show the furthest-along status, not whichever
  //                       record happened to be read last.
  //   mode=push-status  — take a merged batch of {contact, drip_status} and
  //                       write each to the Sheet.
  const mode = event.queryStringParameters?.mode;

  if (mode === "scan-status") {
    const limit = Math.min(Math.max(Number(event.queryStringParameters?.limit) || 40, 1), 100);
    const startAfter = event.queryStringParameters?.startAfter || null;

    let keys;
    try {
      const store = getBlobStore("leads");
      const listed = await store.list();
      keys = (listed.blobs || []).map((b) => b.key).sort();
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: `Lead store list failed: ${err.message}` }) };
    }

    const store = getBlobStore("leads");
    const startIndex = startAfter ? keys.findIndex((k) => k > startAfter) : 0;
    const from = startIndex < 0 ? keys.length : startIndex;
    const statuses = {};
    let cursor = startAfter;
    let index = from;
    let scanned = 0;

    for (; index < keys.length && scanned < limit; index++) {
      cursor = keys[index];
      scanned++;
      let lead;
      try {
        lead = await store.get(keys[index], { type: "json" });
      } catch {
        continue;
      }
      if (!lead || !lead.contact || !lead.drip_status) continue;
      const email = String(lead.contact).trim().toLowerCase();
      statuses[email] = furthestAlong(statuses[email], lead.drip_status);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ scanned, totalKeys: keys.length, cursor, scanComplete: index >= keys.length, statuses }),
    };
  }

  if (mode === "push-status") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
    }
    const updates = Array.isArray(body.updates) ? body.updates : [];
    if (!updates.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "updates must be a non-empty array" }) };
    }
    if (updates.length > 50) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Max 50 updates per call" }) };
    }

    const dryRun = body.dryRun !== false;
    const results = { updated: [], unchanged: [], missing: [], failed: [], dryRun };

    for (const u of updates) {
      const contact = String(u.contact || "").trim().toLowerCase();
      const dripStatus = String(u.drip_status || "").trim();
      if (!contact || !dripStatus) {
        results.failed.push({ contact, error: "contact and drip_status are required" });
        continue;
      }
      if (dryRun) {
        results.updated.push({ contact, drip_status: dripStatus, dryRun: true });
        continue;
      }
      try {
        const res = await syncLeadStatusToGoogleSheets({ contact, drip_status: dripStatus });
        if (res.skipped) results.failed.push({ contact, error: res.reason });
        else if (res.action === "missing") results.missing.push(contact);
        else if (res.action === "unchanged") results.unchanged.push(contact);
        else results.updated.push({ contact, drip_status: dripStatus });
      } catch (err) {
        results.failed.push({ contact, error: err.message });
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify(results) };
  }
  // -------------------------------------------------------------------------

  return {
    statusCode: 409,
    headers,
    body: JSON.stringify({
      error: "Full lead-event backfill is disabled to protect Lead Count. Use mode=scan-status + mode=push-status to reconcile the Drip Status column, which is replay-safe.",
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
