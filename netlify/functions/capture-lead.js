const { getBlobStore } = require("./lib/store");
const { syncLeadToGoogleSheets } = require("./lib/google-sheets");
const { Resend } = require("resend");
const { VERSION } = require("./config");
const crypto = require("crypto");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const DEDUPE_WINDOW_MS = 60 * 60 * 1000;
const DOWNLOAD_GRANT_TTL_MS = 48 * 60 * 60 * 1000;
const STILL_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const STILL_RATE_LIMIT_MAX = 5;

// These domains exist chiefly to issue throwaway mailboxes. This is deliberately
// a small, conservative denylist: normal Gmail aliases (name+tag@gmail.com),
// work addresses, and lesser-known providers must continue to work.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com", "dispostable.com", "getnada.com", "guerrillamail.com",
  "guerrillamailblock.com", "maildrop.cc", "mailinator.com", "sharklasers.com",
  "tempmail.com", "throwawaymail.com", "trashmail.com", "yopmail.com",
]);

function getClientIp(event) {
  const forwarded = String(event.headers["x-forwarded-for"] || "");
  return (forwarded.split(",")[0] || event.headers["x-nf-client-connection-ip"] || "unknown").trim();
}

function isValidEmail(value) {
  if (value.length > 254) return false;
  const [local, domain, ...extra] = value.split("@");
  if (extra.length || !local || !domain || local.length > 64) return false;
  // Requiring an alphanumeric first character prevents spreadsheet-formula
  // prefixes while still accepting normal aliases such as name+tag@gmail.com.
  if (!/^[A-Za-z0-9][A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]*$/.test(local)) return false;
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(domain);
}

function isDisposableEmail(value) {
  const domain = value.split("@")[1]?.toLowerCase();
  return Boolean(domain && DISPOSABLE_EMAIL_DOMAINS.has(domain));
}

async function takeStillRateLimit(event) {
  const ipHash = crypto.createHash("sha256").update(getClientIp(event)).digest("hex");
  const key = `still_${ipHash}`;
  const store = getBlobStore("lead-rate-limits");
  const now = Date.now();
  const current = await store.get(key, { type: "json" }).catch(() => null);
  const fresh = current && now - new Date(current.window_started_at).getTime() < STILL_RATE_LIMIT_WINDOW_MS;
  const count = fresh ? Number(current.count || 0) : 0;
  if (count >= STILL_RATE_LIMIT_MAX) return false;
  await store.setJSON(key, {
    window_started_at: fresh ? current.window_started_at : new Date(now).toISOString(),
    count: count + 1,
  });
  return true;
}

function siteOrigin(event) {
  // A download link must return to the exact deploy that captured the request.
  // Netlify supplies Host from the request; only accept our production or
  // deploy-preview hostnames rather than reflecting arbitrary input.
  const host = String(event.headers.host || "").toLowerCase();
  const trustedHost = host === "carbonatedaudio.com"
    || host === "www.carbonatedaudio.com"
    || /^[a-z0-9-]+--carbinated-audio\.netlify\.app$/.test(host)
    || host === "carbinated-audio.netlify.app";
  const siteUrl = trustedHost
    ? `https://${host}`
    : String(process.env.DEPLOY_PRIME_URL || process.env.URL || "https://carbonatedaudio.com").replace(/\/$/, "");
  return siteUrl;
}

function stillDownloadUrl(event, token) {
  return `${siteOrigin(event)}/.netlify/functions/download-still?token=${encodeURIComponent(token)}`;
}

function stillConfirmUrl(event, token) {
  return `${siteOrigin(event)}/.netlify/functions/verify-still-download?token=${encodeURIComponent(token)}`;
}

// The emailed button confirms the inbox and downloads in one click. Someone who
// already grabbed the file on the page loses nothing by using it again; someone
// who never returns simply stays out of the drip.
function buildStillWelcomeEmail(event, token) {
  const url = stillConfirmUrl(event, token);
  return `<!DOCTYPE html><html><body style="margin:0;padding:32px;background:#0d0a1a;color:#fff;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#0c161e;border:1px solid #1d2f3a;border-radius:16px;padding:36px 30px;text-align:center;">
    <div style="font-size:24px;font-weight:800;margin-bottom:20px;">Carbonated Audio</div>
    <h1 style="font-size:24px;margin:0 0 12px;">Still is yours. Free.</h1>
    <p style="color:#a9c4c5;line-height:1.55;margin:0 0 26px;">Your download should already have started on the site. If it did not, this button confirms your email and downloads the installer.</p>
    <a href="${url}" style="display:inline-block;background:#6fc7bc;color:#07201c;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:800;">Confirm &amp; download Still</a>
    <p style="color:#a9c4c5;line-height:1.55;margin:26px 0 0;font-size:14px;">Confirming also puts you on the list for the Windows release. This link works for 48 hours.</p>
    <p style="color:#6b8a8b;font-size:12px;line-height:1.5;margin:18px 0 0;">Signed &amp; notarized installer &middot; VST3 / AU / AAX &middot; Windows coming soon</p>
    <p style="color:#6b8a8b;font-size:12px;line-height:1.5;margin:18px 0 0;">Cleaning up vocals? <a href="https://carbonatedaudio.com/desipper?utm_source=still_email&utm_medium=email&utm_campaign=still_welcome" style="color:#00d4ff;text-decoration:none;font-weight:600;">De-Sipper</a> ($20) handles the sibilance Still reveals. Or take the <a href="https://carbonatedaudio.com/bundle?utm_source=still_email&utm_medium=email&utm_campaign=still_welcome" style="color:#ff6b2b;text-decoration:none;font-weight:600;">Complete Bundle</a>.</p>
  </div></body></html>`;
}

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

  let contact, source, honeypot, landingPage, referrer, utmSource, utmMedium, utmCampaign;
  try {
    const body = JSON.parse(event.body);
    contact = (body.contact || "").trim().toLowerCase();
    source = body.source || "demo-gate";
    honeypot = (body.website || "").trim();
    landingPage = String(body.landing_page || "").slice(0, 300);
    referrer = String(body.referrer || "").slice(0, 300);
    utmSource = String(body.utm_source || "").slice(0, 120);
    utmMedium = String(body.utm_medium || "").slice(0, 120);
    utmCampaign = String(body.utm_campaign || "").slice(0, 160);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Invalid body" }) };
  }

  // Honeypot: real users never fill the hidden "website" field. Pretend success, store nothing.
  if (honeypot) {
    console.log(`Honeypot tripped (source=${source}) — dropping silently`);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }

  if (!contact) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Missing contact" }) };
  }

  const isStillLead = source && source.includes("still");
  if (isStillLead && !isValidEmail(contact)) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Enter a valid email address" }) };
  }
  if (isStillLead && isDisposableEmail(contact)) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Please use a permanent email address" }) };
  }
  if (isStillLead) {
    try {
      if (!await takeStillRateLimit(event)) {
        return { statusCode: 429, headers, body: JSON.stringify({ success: false, error: "Please check your inbox before requesting another download" }) };
      }
    } catch (rateErr) {
      // A rate-store outage must not make the free download unavailable.
      console.error("Still rate limit error (non-fatal):", rateErr.message);
    }
  }

  const now = new Date().toISOString();

  const dedupeKey = `${source}:${contact.toLowerCase()}`;
  try {
    const dedupeStore = getBlobStore("lead-dedupe");
    const prev = await dedupeStore.get(dedupeKey, { type: "json" });
    if (prev && prev.last_captured) {
      const age = Date.now() - new Date(prev.last_captured).getTime();
      if (age < DEDUPE_WINDOW_MS) {
        console.log(`Dedupe hit for ${dedupeKey} (age ${Math.floor(age / 1000)}s) — skipping emails + lead write`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, deduped: true }),
        };
      }
    }
    await dedupeStore.setJSON(dedupeKey, { last_captured: now });
  } catch (dedupeErr) {
    console.error("Dedupe check error (non-fatal, proceeding):", dedupeErr.message);
  }

  const key = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const lead = {
    event_id: key,
    contact,
    source,
    timestamp: now,
    landing_page: landingPage,
    referrer,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    ip: event.headers["x-forwarded-for"] || "unknown",
    // Held out of the drip until verify-still-download flips this to
    // "email1_sent". The download itself is already theirs.
    drip_status: isStillLead ? "unverified" : "email1_pending",
    verification_status: isStillLead ? "pending" : "not_required",
  };

  // Save lead to Blobs (non-blocking — don't let this kill the email)
  try {
    const store = getBlobStore("leads");
    await store.setJSON(key, lead);
  } catch (storeErr) {
    console.error("Lead store error (non-fatal):", storeErr.message);
  }

  // A free plugin should not be held behind an inbox round-trip. The visitor
  // gets a download grant immediately; confirming the email is what earns a
  // place in the drip, and that is handled by verify-still-download.
  if (isStillLead) {
    if (!process.env.RESEND_API_KEY) {
      return { statusCode: 503, headers, body: JSON.stringify({ success: false, error: "Email delivery is temporarily unavailable" }) };
    }

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const downloadUrl = stillDownloadUrl(event, rawToken);

    try {
      await getBlobStore("still-downloads").setJSON(`dl_${tokenHash}`, {
        lead_key: key,
        contact,
        issued_at: now,
        expires_at: new Date(Date.now() + DOWNLOAD_GRANT_TTL_MS).toISOString(),
        downloads: 0,
      });
    } catch (grantErr) {
      // Without a stored grant the download link cannot be honoured, so this
      // is the one failure here worth refusing on.
      console.error("Still download grant failed:", grantErr.message);
      await getBlobStore("lead-dedupe").setJSON(dedupeKey, { last_captured: new Date(0).toISOString() }).catch(() => {});
      return { statusCode: 503, headers, body: JSON.stringify({ success: false, error: "We could not prepare your download. Please try again." }) };
    }

    // Delivery problems must not cost someone the plugin they just asked for.
    // They already hold a working link; the email is the drip invitation.
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_EMAIL,
        reply_to: "mixedbysoda@gmail.com",
        to: contact,
        subject: "Still is yours — free noise suppressor 💧",
        html: buildStillWelcomeEmail(event, rawToken),
      });
      await getBlobStore("leads").setJSON(key, {
        ...lead,
        welcome_sent_at: new Date().toISOString(),
      }).catch(() => {});
    } catch (emailErr) {
      console.error("Still welcome email failed (download still granted):", emailErr.message);
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_EMAIL,
        to: "mixedbysoda@gmail.com",
        subject: `🔔 New Still Lead (FREE download): ${contact}`,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;"><h2 style="color:#6fc7bc;">New Still Lead</h2><p><strong>Email:</strong> ${contact}</p><p><strong>Source:</strong> ${source}</p><p><strong>Time:</strong> ${now}</p><p style="color:#a9c4c5;">Unconfirmed until they click the email button. Drip holds until then.</p></div>`,
      });
    } catch (notifyErr) {
      console.error("Still lead notification failed (non-fatal):", notifyErr.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, download_url: downloadUrl }),
    };
  }

  // The Sheet is the business-facing report; Blobs remains the source of truth.
  // A sync failure is recorded but must never interrupt the demo email.
  try {
    await syncLeadToGoogleSheets(lead);
  } catch (sheetErr) {
    console.error("Google Sheets sync error (non-fatal):", sheetErr.message);
  }

  // Send Email 1 immediately — welcome + download link
  const isDesipperLead = source && source.includes("desipper");
  const isOnTapLead = source && source.includes("ontap");
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_EMAIL,
        reply_to: "mixedbysoda@gmail.com",
        to: contact,
        subject: isOnTapLead
          ? "Your On Tap Demo is ready 🎚️"
          : isDesipperLead
            ? "Your De-Sipper Demo is ready 🎤"
            : "Your Carbonator Demo is ready 🎛️",
        html: isOnTapLead
          ? buildOnTapWelcomeEmail(contact)
          : isDesipperLead
            ? buildDesipperWelcomeEmail(contact)
            : buildWelcomeEmail(contact),
      });

      // Update drip status
      try {
        const store = getBlobStore("leads");
        await store.setJSON(key, {
          ...lead,
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
        subject: isOnTapLead
          ? `🔔 New On Tap Lead: ${contact}`
          : isDesipperLead
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
            &copy; ${new Date().getFullYear()} Carbonated Audio &middot; <a href="https://carbonatedaudio.com" style="color:#6b6580;">carbonatedaudio.com</a><br><a href="mailto:hello@carbonatedaudio.com?subject=Unsubscribe" style="color:#6b6580;">Unsubscribe</a>
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
            &copy; ${new Date().getFullYear()} Carbonated Audio &middot; <a href="https://carbonatedaudio.com" style="color:#6b6580;">carbonatedaudio.com</a><br><a href="mailto:hello@carbonatedaudio.com?subject=Unsubscribe" style="color:#6b6580;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildOnTapWelcomeEmail(contact) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0d0a1a;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0a1a;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;"><span style="font-size:28px;font-weight:800;color:#fff;">Carbonated Audio</span></td></tr>
<tr><td style="background-color:#1a1430;border-radius:16px;padding:40px 32px;">
<h1 style="color:#fff;font-size:24px;text-align:center;margin:0 0 8px;">Your On Tap Demo is Ready</h1>
<p style="color:#a09bb5;font-size:16px;text-align:center;margin:0 0 32px;">Instant sidechain ducking. 16 curves. No compressor routing.</p>
<div style="text-align:center;margin:0 0 32px;">
<a href="https://github.com/mixedbysoda-stack/ontap/releases/download/v1.0.0/OnTap-v1.0.0-Installer.pkg" style="background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">Download On Tap Demo</a>
</div>
<hr style="border:none;border-top:1px solid #2a2440;margin:0 0 24px;">
<h2 style="color:#fff;font-size:18px;margin:0 0 16px;">What On Tap does:</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#a09bb5;">
<tr><td style="padding:6px 0;"><strong style="color:#a855f7;">16 Ducking Curves</strong> — Sidechain pump, sub bass, kick trim, reverse chain, and more.</td></tr>
<tr><td style="padding:6px 0;"><strong style="color:#a855f7;">3 Trigger Modes</strong> — Sync to DAW tempo, trigger via MIDI, or use audio input.</td></tr>
<tr><td style="padding:6px 0;"><strong style="color:#a855f7;">Band-Split Crossover</strong> — Duck only the frequencies you want.</td></tr>
<tr><td style="padding:6px 0;"><strong style="color:#a855f7;">Zero Latency</strong> — Anti-click smoothing for clean transitions.</td></tr>
</table>
<hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">
<p style="color:#a09bb5;font-size:14px;margin:0;text-align:center;">
Demo plays full audio for 60s, then mutes for 10s.<br>
<a href="https://carbonatedaudio.com/ontap" style="color:#a855f7;text-decoration:none;font-weight:600;">Buy On Tap ($20)</a> to remove the limitation.
</p>
</td></tr>
<tr><td align="center" style="padding-top:32px;">
<p style="color:#6b6580;font-size:12px;margin:0;">Questions? Reply to this email.</p>
<p style="color:#6b6580;font-size:12px;margin:8px 0 0;">&copy; ${new Date().getFullYear()} Carbonated Audio</p>
</td></tr>
</table></td></tr></table></body></html>`;
}
