const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };

  // Simple token auth — set LEADS_ADMIN_TOKEN in Netlify env vars
  const token = event.queryStringParameters?.token;
  const adminToken = process.env.LEADS_ADMIN_TOKEN;

  if (!adminToken || token !== adminToken) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const store = getStore("leads");
    let blobs = [];
    try {
      const result = await store.list();
      blobs = result.blobs || [];
    } catch (listErr) {
      // Store doesn't exist yet (no leads captured) — return empty
      return { statusCode: 200, headers, body: JSON.stringify({ total: 0, leads: [] }) };
    }

    const raw = await Promise.all(
      blobs.map(async ({ key }) => {
        try {
          const data = await store.get(key, { type: "json" });
          return data;
        } catch {
          return null;
        }
      })
    );

    // Filter out null/corrupted entries, then sort newest first
    const leads = raw.filter((l) => l && l.timestamp);
    leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ total: leads.length, leads }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
