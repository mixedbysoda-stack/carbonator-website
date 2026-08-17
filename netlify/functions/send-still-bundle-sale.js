// One-time September 2026 bundle campaign for Still downloaders.
//
// It is deliberately manually invoked, duplicate-safe, and excludes buyers.
// Netlify Blobs remains the source of audience state; Stripe remains the
// authority for whether a contact already owns a paid Carbonated Audio product.

const { getBlobStore } = require("./lib/store");
const { isSuppressed } = require("./lib/suppression");
const { loadBuyerEmails } = require("./lib/buyers");
const { Resend } = require("resend");
const { buildEmail } = require("../../email-templates/render");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const REPLY_TO = "mixedbysoda@gmail.com";
const CAMPAIGN_KEY = "still_september_bundle_2026_sent_at";
const BUNDLE_URL =
  "https://carbonatedaudio.com/bundle?utm_source=still_leads&utm_medium=email&utm_campaign=september_bundle&utm_content=still_bundle_offer";

function isStillLead(lead) {
  return String(lead?.source || "").toLowerCase().includes("still");
}

function campaignEmail() {
  return buildEmail("spotlight", {
    product: "still",
    headline: "You cleared the noise. Now build the rest of the chain.",
    body: `
      <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">Still was made to get background noise out of the way. If it made your vocal or track cleaner, the rest of the Carbonated Audio tools are ready when you are.</p>
      <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">For September only, get the complete 6-plugin collection for <strong style="color:#ffffff;">$45</strong> &mdash; normally $109.</p>
    `,
    features: [
      "<strong style=\"color:#ffffff;\">Carbonator + FIZZFUEL</strong> &mdash; warmth, grit, and creative movement",
      "<strong style=\"color:#ffffff;\">De-Sipper + On Tap + Pour</strong> &mdash; vocal cleanup, ducking, and width",
      "<strong style=\"color:#ffffff;\">Still</strong> &mdash; already yours, included in the full collection",
    ],
    ctaText: "See the $45 complete bundle",
    ctaUrl: BUNDLE_URL,
    signatureName: "Soda",
    preheader: "All 6 Carbonated Audio plugins are $45 through September 30.",
  });
}

exports.handler = async (event) => {
  const suppliedToken = event.queryStringParameters?.token;
  const adminToken = process.env.LEADS_ADMIN_TOKEN;
  const dryRun = event.queryStringParameters?.dry_run === "1";

  if (!adminToken || suppliedToken !== adminToken) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }
  if (!process.env.RESEND_API_KEY) {
    return { statusCode: 503, body: JSON.stringify({ error: "Email provider is not configured" }) };
  }

  const store = getBlobStore("leads");
  const { blobs = [] } = await store.list();
  const buyers = await loadBuyerEmails();
  const seenEmails = new Set();
  const candidates = [];
  let excludedBuyers = 0;
  let excludedSuppressed = 0;
  let excludedPreviouslySent = 0;

  for (const blob of blobs) {
    const lead = await store.get(blob.key, { type: "json" });
    const email = String(lead?.contact || "").trim().toLowerCase();
    if (!email || !isStillLead(lead) || seenEmails.has(email)) continue;
    seenEmails.add(email);

    if (buyers.has(email)) {
      excludedBuyers++;
      continue;
    }
    if (isSuppressed(email)) {
      excludedSuppressed++;
      continue;
    }
    if (lead[CAMPAIGN_KEY]) {
      excludedPreviouslySent++;
      continue;
    }
    candidates.push({ blob, lead, email });
  }

  if (dryRun) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        dry_run: true,
        eligible: candidates.length,
        excluded_buyers: excludedBuyers,
        excluded_suppressed: excludedSuppressed,
        excluded_previously_sent: excludedPreviouslySent,
      }),
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  const failed = [];
  const now = new Date().toISOString();
  const html = campaignEmail();

  for (const candidate of candidates) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        reply_to: REPLY_TO,
        to: candidate.email,
        subject: "You cleared the noise. Now build the rest of the chain.",
        html,
        headers: {
          "List-Unsubscribe": "<mailto:hello@carbonatedaudio.com?subject=unsubscribe>",
        },
      });
      candidate.lead[CAMPAIGN_KEY] = now;
      candidate.lead.still_september_bundle_2026_campaign = "sent";
      await store.setJSON(candidate.blob.key, candidate.lead);
      sent++;
    } catch (error) {
      console.error("Still bundle campaign send failed:", error.message);
      failed.push(candidate.blob.key);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      sent,
      failed: failed.length,
      eligible: candidates.length,
      excluded_buyers: excludedBuyers,
      excluded_suppressed: excludedSuppressed,
      excluded_previously_sent: excludedPreviouslySent,
    }),
  };
};
