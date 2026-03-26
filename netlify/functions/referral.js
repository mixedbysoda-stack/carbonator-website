// Referral tracking — generates referral links and tracks clicks
// GET ?action=track&ref=CODE — logs a referral click, redirects to homepage
// GET ?action=stats&email=EMAIL&token=TOKEN — returns referral stats for a buyer

const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

function generateRefCode(email) {
  return crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex")
    .slice(0, 8);
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const action = params.action;

  if (action === "track") {
    const refCode = params.ref;
    if (!refCode) {
      return { statusCode: 302, headers: { Location: "/" }, body: "" };
    }

    // Log the referral click
    try {
      const store = getStore("referrals");
      const existing = await store.get(`clicks_${refCode}`, { type: "json" }).catch(() => null);
      const clicks = existing ? existing.clicks + 1 : 1;
      await store.setJSON(`clicks_${refCode}`, {
        ref_code: refCode,
        clicks,
        last_click: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Referral track error:", err.message);
    }

    // Redirect to homepage with ref param (so capture-lead can tag the source)
    return {
      statusCode: 302,
      headers: { Location: `/?ref=referral_${refCode}` },
      body: "",
    };
  }

  if (action === "stats") {
    const email = params.email;
    const token = params.token;

    if (!email || !token || token !== process.env.LEADS_ADMIN_TOKEN) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const refCode = generateRefCode(email);

    try {
      const store = getStore("referrals");
      const clickData = await store.get(`clicks_${refCode}`, { type: "json" }).catch(() => null);
      const conversionData = await store.get(`conversions_${refCode}`, { type: "json" }).catch(() => null);

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref_code: refCode,
          ref_link: `https://carbonatedaudio.com/.netlify/functions/referral?action=track&ref=${refCode}`,
          clicks: clickData ? clickData.clicks : 0,
          conversions: conversionData ? conversionData.conversions : 0,
        }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: err.message }),
      };
    }
  }

  // Default: generate a referral link for an email
  if (action === "generate") {
    const email = params.email;
    if (!email) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing email" }),
      };
    }

    const refCode = generateRefCode(email);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref_code: refCode,
        ref_link: `https://carbonatedaudio.com/.netlify/functions/referral?action=track&ref=${refCode}`,
      }),
    };
  }

  return { statusCode: 400, body: "Unknown action" };
};

module.exports.generateRefCode = generateRefCode;
