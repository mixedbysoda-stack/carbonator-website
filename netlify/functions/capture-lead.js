const { getBlobStore } = require("./lib/store");
const { sendEmail } = require("./lib/mailer");
const { syncLeadToGoogleSheets, syncLeadStatusToGoogleSheets } = require("./lib/google-sheets");
const { buildWelcome, buildStillWelcomeEmail, PRODUCT_LABELS } = require("./lib/welcome-emails");
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
      await sendEmail(resend, {
        from: FROM_EMAIL,
        reply_to: "mixedbysoda@gmail.com",
        to: contact,
        subject: "Still is yours — free noise suppressor 💧",
        html: buildStillWelcomeEmail(stillConfirmUrl(event, rawToken)),
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
      await sendEmail(resend, {
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
  //
  // Note the Still branch above returns before reaching this, deliberately: the
  // Sheet is a report of confirmed leads, and an unconfirmed Still download is
  // not one yet. verify-still-download.js syncs the row when they click through.
  // Measured 2026-08-23: 52 unconfirmed Still leads visible in Blobs and absent
  // from the Sheet. That is intended, not drift.
  try {
    await syncLeadToGoogleSheets(lead);
  } catch (sheetErr) {
    console.error("Google Sheets sync error (non-fatal):", sheetErr.message);
  }

  // Send Email 1 immediately — welcome + download link.
  //
  // Routing lives in lib/welcome-emails.js so this path and backfill-welcome.js
  // can never disagree about which email a source deserves. Until 2026-08-23
  // this branched on desipper/ontap only, so every Pour and FIZZFUEL lead was
  // welcomed to Carbonator — 28 Pour leads received the wrong plugin's email.
  const welcome = buildWelcome({ source });
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await sendEmail(resend, {
        from: FROM_EMAIL,
        reply_to: "mixedbysoda@gmail.com",
        to: contact,
        subject: welcome.subject,
        html: welcome.html,
      });

      // Update drip status
      try {
        const store = getBlobStore("leads");
        const sentLead = {
          ...lead,
          drip_status: "email1_sent",
          email1_sent_at: new Date().toISOString(),
        };
        await store.setJSON(key, sentLead);
        // The Sheet was written above with drip_status "email1_pending", the
        // value this lead carried before the send. Push the real status across
        // or the reporting view stays frozen at "pending" forever — that drift
        // is what made 59 fully-nurtured leads look stranded on 2026-08-23.
        await syncLeadStatusToGoogleSheets(sentLead).catch((statusErr) =>
          console.error("Lead status Sheet sync failed (non-fatal):", statusErr.message)
        );
      } catch (updateErr) {
        console.error("Lead status update error (non-fatal):", updateErr.message);
      }

      console.log(`Welcome email sent to ${contact} (${welcome.product})`);
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr.message);
    }

    // Notify yourself about the new lead
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await sendEmail(resend, {
        from: FROM_EMAIL,
        to: "mixedbysoda@gmail.com",
        subject: `🔔 New ${PRODUCT_LABELS[welcome.product] || "Carbonator"} Lead: ${contact}`,
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
