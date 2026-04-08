const { getBlobStore } = require("./lib/store");
const { Resend } = require("resend");
const { VERSION } = require("./config");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false }) };
  }

  let contact, source;
  try {
    const body = JSON.parse(event.body);
    contact = (body.contact || "").trim();
    source = body.source || "demo-gate";
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Invalid body" }) };
  }

  if (!contact) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Missing contact" }) };
  }

  const now = new Date().toISOString();
  const key = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Save lead to Blobs (non-blocking — don't let this kill the email)
  try {
    const store = getBlobStore("leads");
    await store.setJSON(key, {
      contact,
      source,
      timestamp: now,
      ip: event.headers["x-forwarded-for"] || "unknown",
      drip_status: "email1_pending",
    });
  } catch (storeErr) {
    console.error("Lead store error (non-fatal):", storeErr.message);
  }

  // Send Email 1 immediately — welcome + download link
  const isDesipperLead = source && source.includes("desipper");
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_EMAIL,
        to: contact,
        subject: isDesipperLead
          ? "Your De-Sipper Demo is ready 🎤"
          : "Your Carbonator Demo is ready 🎛️",
        html: isDesipperLead
          ? buildDesipperWelcomeEmail(contact)
          : buildWelcomeEmail(contact),
      });

      // Update drip status
      try {
        const store = getBlobStore("leads");
        await store.setJSON(key, {
          contact,
          source,
          timestamp: now,
          ip: event.headers["x-forwarded-for"] || "unknown",
          drip_status: "email1_sent",
          email1_sent_at: new Date().toISOString(),
        });
      } catch (updateErr) {
        console.error("Lead status update error (non-fatal):", updateErr.message);
      }

      console.log(`Welcome email sent to ${contact}`);
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr.message);
    }

    // Notify yourself about the new lead
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_EMAIL,
        to: "mixedbysoda@gmail.com",
        subject: isDesipperLead
          ? `🔔 New De-Sipper Lead: ${contact}`
          : `🔔 New Carbonator Lead: ${contact}`,
        html: `
          <div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;">
            <h2 style="color:#ff6b2b;">New Lead Captured</h2>
            <p><strong>Email:</strong> ${contact}</p>
            <p><strong>Source:</strong> ${source}</p>
            <p><strong>Time:</strong> ${now}</p>
            <p><strong>IP:</strong> ${event.headers["x-forwarded-for"] || "unknown"}</p>
            <hr style="border-color:#2a2440;">
            <p style="color:#6b6580;font-size:12px;">This is an automated notification from your Carbonator lead capture system.</p>
          </div>`,
      });
    } catch (notifyErr) {
      console.error("Lead notification email failed:", notifyErr.message);
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true }),
  };
};

function buildWelcomeEmail(email) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0a1a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0a1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:28px;font-weight:800;color:#ffffff;">Carbonated Audio</span>
        </td></tr>

        <tr><td style="background-color:#1a1430;border-radius:16px;padding:40px 32px;">

          <h1 style="color:#ffffff;font-size:24px;text-align:center;margin:0 0 8px;">Your Carbonator Demo is ready!</h1>
          <p style="color:#a09bb5;font-size:16px;text-align:center;margin:0 0 32px;">Here's your download link and a quick guide to get the most out of each flavor.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td align="center">
              <a href="https://carbonatedaudio.com/Carbonator%20DEMO.zip" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#ff6b2b,#ff8c42);color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">
                Download Carbonator Demo
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #2a2440;margin:0 0 24px;">

          <h2 style="color:#ffffff;font-size:18px;margin:0 0 16px;">What each flavor does best:</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#a09bb5;">
            <tr><td style="padding:6px 0;"><span style="font-size:16px;">🥤</span> <strong style="color:#ff6b2b;">Cola</strong> — Console warmth. Use on drums and full mix for glue.</td></tr>
            <tr><td style="padding:6px 0;"><span style="font-size:16px;">🍒</span> <strong style="color:#e63946;">Cherry</strong> — Aggressive tube grit. Try on bass and synths.</td></tr>
            <tr><td style="padding:6px 0;"><span style="font-size:16px;">🍇</span> <strong style="color:#cc33ff;">Grape</strong> — Lo-fi destruction. Perfect for vocals and creative FX.</td></tr>
            <tr><td style="padding:6px 0;"><span style="font-size:16px;">🍋</span> <strong style="color:#ffd700;">Lemon-Lime</strong> — Harmonic sparkle. Makes hi-hats and acoustic guitars shine.</td></tr>
            <tr><td style="padding:6px 0;"><span style="font-size:16px;">🍊</span> <strong style="color:#ff8c42;">Orange Cream</strong> — Warm filtered drive. Beautiful on pads and keys.</td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">

          <h2 style="color:#ffffff;font-size:16px;margin:0 0 12px;">Quick Start</h2>
          <ol style="color:#a09bb5;font-size:14px;padding-left:20px;margin:0;">
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">macOS:</strong> Open the .pkg installer — choose VST3, AU, AAX, or Standalone.</li>
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Windows:</strong> Extract .zip → copy VST3 to <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;">C:\\Program Files\\Common Files\\VST3\\</code></li>
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Rescan plugins</strong> in your DAW, drop Carbonator on a track, pick a flavor.</li>
          </ol>

          <p style="color:#a09bb5;font-size:14px;margin:24px 0 0;text-align:center;">
            <em>Pro tip: try Carbonated mode — it blends all 5 flavors with a single knob.</em>
          </p>

        </td></tr>

        <tr><td align="center" style="padding-top:32px;">
          <p style="color:#6b6580;font-size:12px;margin:0;">
            Questions? Just reply to this email.
          </p>
          <p style="color:#6b6580;font-size:12px;margin:8px 0 0;">
            &copy; ${new Date().getFullYear()} Carbonated Audio &middot; <a href="https://carbonatedaudio.com" style="color:#6b6580;">carbonatedaudio.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildDesipperWelcomeEmail(email) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0a1a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0a1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:28px;font-weight:800;color:#ffffff;">Carbonated Audio</span>
        </td></tr>

        <tr><td style="background-color:#1a1430;border-radius:16px;padding:40px 32px;">

          <h1 style="color:#ffffff;font-size:24px;text-align:center;margin:0 0 8px;">Thanks for your interest in De-Sipper!</h1>
          <p style="color:#a09bb5;font-size:16px;text-align:center;margin:0 0 32px;">The demo is coming soon. We'll email you the download link as soon as it's ready.</p>

          <hr style="border:none;border-top:1px solid #2a2440;margin:0 0 24px;">

          <h2 style="color:#ffffff;font-size:18px;margin:0 0 16px;">What De-Sipper does:</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#a09bb5;">
            <tr><td style="padding:6px 0;"><strong style="color:#00d4ff;">Transparent De-Essing</strong> — Tames harsh sibilance without killing your vocal's brightness.</td></tr>
            <tr><td style="padding:6px 0;"><strong style="color:#00d4ff;">Split-Band Processing</strong> — Only touches the sibilant frequencies. Everything else passes through clean.</td></tr>
            <tr><td style="padding:6px 0;"><strong style="color:#00d4ff;">Listen Mode</strong> — Solo exactly what's being removed so you can dial it in perfectly.</td></tr>
            <tr><td style="padding:6px 0;"><strong style="color:#00d4ff;">Zero Latency</strong> — No lookahead delay. Works in real-time for tracking and mixing.</td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">

          <p style="color:#a09bb5;font-size:14px;margin:0;text-align:center;">
            In the meantime, check out <a href="https://carbonatedaudio.com/carbonator" style="color:#ff6b2b;text-decoration:none;font-weight:600;">Carbonator</a> — our analog saturation plugin with 5 circuit-modeled flavors.
          </p>

        </td></tr>

        <tr><td align="center" style="padding-top:32px;">
          <p style="color:#6b6580;font-size:12px;margin:0;">
            Questions? Just reply to this email.
          </p>
          <p style="color:#6b6580;font-size:12px;margin:8px 0 0;">
            &copy; ${new Date().getFullYear()} Carbonated Audio &middot; <a href="https://carbonatedaudio.com" style="color:#6b6580;">carbonatedaudio.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
