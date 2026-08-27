const crypto = require("crypto");
const { sendEmail } = require("./lib/mailer");
const { Resend } = require("resend");
const { getBlobStore } = require("./lib/store");
const { syncLeadToGoogleSheets } = require("./lib/google-sheets");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";

function page(title, message) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:32px;background:#0d0a1a;color:#fff;font-family:Arial,Helvetica,sans-serif;"><main style="max-width:560px;margin:8vh auto;background:#0c161e;border:1px solid #1d2f3a;border-radius:16px;padding:36px 30px;text-align:center;"><div style="font-size:24px;font-weight:800;margin-bottom:20px;">Carbonated Audio</div><h1 style="font-size:25px;margin:0 0 12px;">${title}</h1><p style="color:#a9c4c5;line-height:1.55;margin:0 0 26px;">${message}</p><a href="https://carbonatedaudio.com/still" style="display:inline-block;background:#6fc7bc;color:#07201c;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:800;">Request Still again</a></main></body></html>`;
}

async function notifyVerifiedLead(lead) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  await sendEmail(resend, {
    from: FROM_EMAIL,
    to: "mixedbysoda@gmail.com",
    subject: `✓ Verified Still Lead: ${lead.contact}`,
    html: `<div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;"><h2 style="color:#6fc7bc;">Verified Still Lead</h2><p><strong>Email:</strong> ${lead.contact}</p><p><strong>Source:</strong> ${lead.source}</p><p><strong>Verified:</strong> ${lead.verified_at}</p></div>`,
  });
}

exports.handler = async (event) => {
  const token = String(event.queryStringParameters?.token || "");
  const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };
  if (!token) {
    return { statusCode: 400, headers, body: page("Missing confirmation link", "Use the most recent email we sent you, or request Still again.") };
  }

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const grants = getBlobStore("still-downloads");
  const grant = await grants.get(`dl_${hash}`, { type: "json" }).catch(() => null);

  if (!grant) {
    return { statusCode: 404, headers, body: page("That link is no longer available", "Request Still again to receive a fresh download link.") };
  }
  if (Date.now() > new Date(grant.expires_at).getTime()) {
    return { statusCode: 410, headers, body: page("That link has expired", "Request Still again to receive a fresh download link.") };
  }

  // Confirming an inbox is what enrols someone in the drip. The installer is
  // not held hostage to it — they already had the file from the page — so a
  // failure anywhere below still ends in a working download.
  try {
    const leads = getBlobStore("leads");
    const lead = await leads.get(grant.lead_key, { type: "json" });

    if (lead && lead.verification_status !== "verified") {
      const verifiedAt = new Date().toISOString();
      const verifiedLead = {
        ...lead,
        verification_status: "verified",
        verified_at: verifiedAt,
        // drip-day3 keys off BOTH of these, not just the status: it needs a
        // timestamp to measure three days from. Setting the status alone left
        // every confirmed Still lead matching `drip_status === "email1_sent"`
        // but failing `Boolean(lead.email1_sent_at)`, so they were silently
        // dropped from the whole sequence — 55 of them between 2026-08-19 and
        // 2026-08-27, on the biggest lead source we have.
        //
        // The welcome IS email 1 and it went out at capture, so that send is
        // what day 3 should count from. verified_at is the fallback for older
        // records that predate welcome_sent_at.
        drip_status: "email1_sent",
        email1_sent_at: lead.welcome_sent_at || verifiedAt,
      };
      await leads.setJSON(grant.lead_key, verifiedLead);
      await grants.setJSON(`dl_${hash}`, { ...grant, verified_at: verifiedAt });
      await syncLeadToGoogleSheets(verifiedLead).catch((err) => console.error("Verified lead Sheet sync failed:", err.message));
      await notifyVerifiedLead(verifiedLead).catch((err) => console.error("Verified lead notification failed:", err.message));
    }
  } catch (err) {
    console.error("Still verification bookkeeping failed (download proceeds):", err.message);
  }

  return {
    statusCode: 302,
    headers: {
      Location: `/.netlify/functions/download-still?token=${encodeURIComponent(token)}`,
      "Cache-Control": "no-store",
    },
    body: "",
  };
};
