// Notify-me list for add-ons that are not released yet (expansion packs,
// Pro Tools templates, the Mega Bundle).
//
// Deliberately separate from capture-lead.js: that path welcomes every lead to
// a plugin DEMO and enrolls them in the drip, and its source routing would
// read "pack_carbonator" as a Carbonator demo request. A waitlist signup wants
// exactly one email, the day the thing ships, so it lives in its own store.
//
// POST { email, item, website }   item = catalog id, "mega_bundle", or "all"
// GET  ?token=LEADS_ADMIN_TOKEN   -> counts per item + every signup, for the
//                                    launch email when an item goes live
const { Resend } = require("resend");
const { getBlobStore } = require("./lib/store");
const { sendEmail } = require("./lib/mailer");
const { escapeHtml } = require("./lib/escape");
const { isSuppressedAsync } = require("./lib/suppression");
const { ADDONS } = require("./config");

const STORE = "addon-waitlist";
const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

function isValidEmail(value) {
  if (!value || value.length > 254) return false;
  const [local, domain, ...extra] = value.split("@");
  if (extra.length || !local || !domain || local.length > 64) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]*$/.test(local)) return false;
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(domain);
}

function itemName(id) {
  if (id === "all") return "every Carbonated add-on";
  const it = ADDONS.byId(id);
  return it ? (id === ADDONS.mega.id ? "the Mega Bundle" : `the ${it.name}`) : null;
}

function confirmationHtml(name) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0a1a;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0a1a;padding:40px 20px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td align="center" style="padding-bottom:24px;"><span style="font-size:24px;font-weight:800;color:#ffffff;">Carbonated Audio</span></td></tr>
<tr><td style="background:#1a1430;border-radius:16px;padding:32px 28px;">
<h1 style="color:#ffffff;font-size:22px;margin:0 0 12px;">You're on the list.</h1>
<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">We'll email you once, the day ${escapeHtml(name)} drops. That's it.</p>
<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0;">While you wait, the plugins are already out: <a href="https://carbonatedaudio.com/addons" style="color:#ff8c42;text-decoration:none;font-weight:600;">see what's coming</a>.</p>
</td></tr>
<tr><td align="center" style="padding-top:24px;"><p style="color:#6b6580;font-size:12px;margin:0;">Didn't sign up? Ignore this and you won't hear from us.<br><a href="mailto:hello@carbonatedaudio.com?subject=Unsubscribe" style="color:#6b6580;">Unsubscribe</a></p></td></tr>
</table></td></tr></table></body></html>`;
}

async function listAll(store) {
  const { blobs } = await store.list();
  const entries = (await Promise.all(
    (blobs || []).map(({ key }) => store.get(key, { type: "json" }).catch(() => null))
  )).filter(Boolean);
  const counts = {};
  for (const e of entries) counts[e.item] = (counts[e.item] || 0) + 1;
  entries.sort((a, b) => String(b.joined_at).localeCompare(String(a.joined_at)));
  return { total: entries.length, counts, entries };
}

exports.handler = async (event) => {
  const store = getBlobStore(STORE);

  if (event.httpMethod === "GET") {
    const token = event.queryStringParameters?.token;
    if (!process.env.LEADS_ADMIN_TOKEN || token !== process.env.LEADS_ADMIN_TOKEN) {
      return json(401, { error: "Unauthorized" });
    }
    try {
      return json(200, await listAll(store));
    } catch (err) {
      return json(200, { total: 0, counts: {}, entries: [], note: err.message });
    }
  }

  if (event.httpMethod !== "POST") return json(405, { success: false });

  let email, item, honeypot;
  try {
    const body = JSON.parse(event.body || "{}");
    email = String(body.email || "").trim().toLowerCase();
    item = String(body.item || "").trim();
    honeypot = String(body.website || "").trim();
  } catch {
    return json(400, { success: false, error: "Invalid body" });
  }

  if (honeypot) return json(200, { success: true }); // bots: pretend, store nothing
  if (!isValidEmail(email)) return json(400, { success: false, error: "Enter a valid email address" });
  const name = itemName(item);
  if (!name) return json(400, { success: false, error: "Unknown item" });

  const key = `${item}/${email}`;
  const existing = await store.get(key, { type: "json" }).catch(() => null);
  if (existing) return json(200, { success: true, already: true });

  const now = new Date().toISOString();
  try {
    await store.setJSON(key, {
      email,
      item,
      joined_at: now,
      page: String(event.headers.referer || "").slice(0, 300),
      notified_at: null,
    });
  } catch (err) {
    console.error("addon-waitlist store failed:", err.message);
    return json(503, { success: false, error: "Could not save that right now. Please try again." });
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    if (!(await isSuppressedAsync(email))) {
      try {
        await sendEmail(resend, {
          from: FROM_EMAIL,
          reply_to: "mixedbysoda@gmail.com",
          to: email,
          subject: `You're on the list for ${name.replace(/^the /, "")}`,
          html: confirmationHtml(name),
        });
      } catch (err) {
        console.error("addon-waitlist confirmation failed (signup kept):", err.message);
      }
    }
    try {
      await sendEmail(resend, {
        from: FROM_EMAIL,
        to: "mixedbysoda@gmail.com",
        subject: `Add-on waitlist: ${item} - ${email.replace(/[\r\n]/g, " ")}`,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;"><h2 style="color:#ff8c42;">New add-on waitlist signup</h2><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Item:</strong> ${escapeHtml(item)}</p><p><strong>Time:</strong> ${now}</p></div>`,
      });
    } catch (err) {
      console.error("addon-waitlist owner notify failed (non-fatal):", err.message);
    }
  }

  return json(200, { success: true });
};
