// Creator program applications (POST from /creators).
//
// Deliberately its own function rather than a branch in capture-lead.js: an
// applicant is not a demo lead. They must not get a "Your X Demo is ready"
// welcome, must not enter the drip, and must not be counted as a generate_lead
// in the funnel numbers. This stores the application, tells SODA, and sends
// the applicant a short acknowledgement. Approval, code minting
// (scripts/create-creator-codes.js) and the welcome email are manual.
const crypto = require("crypto");
const { Resend } = require("resend");
const { getBlobStore } = require("./lib/store");
const { sendEmail } = require("./lib/mailer");
const { escapeHtml } = require("./lib/escape");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const OWNER_EMAIL = "mixedbysoda@gmail.com";
const PLATFORMS = new Set(["youtube", "tiktok", "instagram", "twitch", "other"]);

const clip = (v, n) => String(v || "").trim().slice(0, n);
const isEmail = (v) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const looksLikeUrl = (v) => /^https?:\/\/[^\s]+$/i.test(v);

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ success: false }) };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Invalid body" }) };
  }

  // Honeypot: real people never fill the hidden "website" field.
  if (clip(body.website, 10)) return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  const app = {
    name: clip(body.name, 80),
    email: clip(body.email, 254).toLowerCase(),
    platform: clip(body.platform, 20).toLowerCase(),
    channel_url: clip(body.channel_url, 300),
    audience: clip(body.audience, 40),
    plugin: clip(body.plugin, 40),
    note: clip(body.note, 1000),
    landing_page: clip(body.landing_page, 300),
    referrer: clip(body.referrer, 300),
    submitted_at: new Date().toISOString(),
    status: "new",
  };

  if (!app.name) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Tell us your name or channel name" }) };
  if (!isEmail(app.email)) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Enter a valid email address" }) };
  if (!PLATFORMS.has(app.platform)) app.platform = "other";
  if (!looksLikeUrl(app.channel_url)) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Paste the full link to your channel or profile (starting with https://)" }) };

  // Store first. If email fails the application is still on record.
  const key = `${app.submitted_at.replace(/[:.]/g, "-")}_${crypto.createHash("sha256").update(app.email).digest("hex").slice(0, 12)}`;
  try {
    await getBlobStore("creator-applications").setJSON(key, app);
  } catch (err) {
    console.error("creator-apply: store failed:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "Could not save your application. Email mixedbysoda@gmail.com instead." }) };
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const e = (v) => escapeHtml(v);
    try {
      await sendEmail(resend, {
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        reply_to: app.email,
        subject: `Creator application: ${app.name.replace(/[\r\n]/g, " ")} (${app.platform})`,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;">
          <h2 style="color:#ff6b2b;">Creator program application</h2>
          <p><strong>Name:</strong> ${e(app.name)}</p>
          <p><strong>Email:</strong> ${e(app.email)}</p>
          <p><strong>Platform:</strong> ${e(app.platform)}</p>
          <p><strong>Channel:</strong> <a href="${e(app.channel_url)}" style="color:#00d4ff;">${e(app.channel_url)}</a></p>
          <p><strong>Audience:</strong> ${e(app.audience || "-")}</p>
          <p><strong>Wants to cover:</strong> ${e(app.plugin || "-")}</p>
          <p><strong>Note:</strong><br>${e(app.note || "-").replace(/\n/g, "<br>")}</p>
          <hr style="border-color:#2a2440;">
          <p style="color:#6b6580;font-size:12px;">To approve: node scripts/create-creator-codes.js --slug=... --name="..." --email=${e(app.email)} then send them the paste-ready block. Stored as creator-applications/${e(key)}.</p>
        </div>`,
      });
    } catch (err) {
      console.error("creator-apply: owner notification failed (non-fatal):", err.message);
    }

    try {
      await sendEmail(resend, {
        from: FROM_EMAIL,
        to: app.email,
        reply_to: OWNER_EMAIL,
        subject: "Got your Carbonated Audio creator application",
        text: [
          `Hey ${app.name},`,
          "",
          "Thanks for applying to the Carbonated Audio creator program. I read every application myself and reply within 48 hours.",
          "",
          "If it is a fit you get: a free All 7 license, a personal 20% code for your audience, and 30% of net on every sale that uses it, paid monthly by PayPal.",
          "",
          "In the meantime, Still is free and the demos are on every product page: https://carbonatedaudio.com",
          "",
          "Soda",
          "Carbonated Audio",
        ].join("\n"),
      });
    } catch (err) {
      console.error("creator-apply: applicant acknowledgement failed (non-fatal):", err.message);
    }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
};
