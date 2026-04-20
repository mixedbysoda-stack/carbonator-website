// Drip Email 3 — Day 7 conversion push (product-aware)
// Trigger: Netlify scheduled function — runs daily
// Finds leads where email2 was sent 4+ days ago (7 days from signup) but no email3 yet

const { getBlobStore } = require("./lib/store");
const { Resend } = require("resend");
const { PRODUCTS } = require("./config");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const BUNDLE_URL = "https://buy.stripe.com/3cI9AT1glbBg7rz1YL3oA08";

exports.handler = async () => {
  if (!process.env.RESEND_API_KEY) {
    return { statusCode: 200, body: "No RESEND_API_KEY — skipping" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const store = getBlobStore("leads");
  const { blobs } = await store.list();

  const now = Date.now();
  const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;
  let sent = 0;
  const results = [];

  for (const blob of blobs) {
    try {
      const lead = await store.get(blob.key, { type: "json" });
      if (!lead || !lead.contact) continue;
      if (lead.drip_status !== "email2_sent") continue;
      if (!lead.email2_sent_at) continue;

      const elapsed = now - new Date(lead.email2_sent_at).getTime();
      if (elapsed < FOUR_DAYS) continue;

      const product = getProductFromSource(lead.source);

      await resend.emails.send({
        from: FROM_EMAIL,
        to: lead.contact,
        subject: getDay7Subject(product),
        html: buildDay7Email(lead.contact, product),
      });

      // Update status
      lead.drip_status = "email3_sent";
      lead.email3_sent_at = new Date().toISOString();
      await store.setJSON(blob.key, lead);

      sent++;
      results.push(`Day 7 email sent to ${lead.contact} (${product})`);
      console.log(`Day 7 email sent to ${lead.contact} (${product})`);
    } catch (err) {
      console.error(`Day 7 email failed for ${blob.key}:`, err.message);
    }
  }

  // Notify about drip activity
  if (sent > 0) {
    try {
      const resend2 = new Resend(process.env.RESEND_API_KEY);
      await resend2.emails.send({
        from: FROM_EMAIL,
        to: "mixedbysoda@gmail.com",
        subject: `📧 Drip Day 7: ${sent} conversion email${sent > 1 ? "s" : ""} sent`,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;">
          <h2 style="color:#ff6b2b;">Drip Day 7 Report</h2>
          <p><strong>${sent}</strong> conversion email${sent > 1 ? "s" : ""} sent:</p>
          <ul>${results.map((r) => `<li>${r}</li>`).join("")}</ul>
          <hr style="border-color:#2a2440;">
          <p style="color:#6b6580;font-size:12px;">Automated drip system — Carbonated Audio</p>
        </div>`,
      });
    } catch (e) {
      console.error("Drip report failed:", e.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ sent, results }),
  };
};

function getProductFromSource(source) {
  if (!source) return "carbonator";
  if (source.includes("pour")) return "pour";
  if (source.includes("ontap")) return "ontap";
  if (source.includes("desipper")) return "desipper";
  return "carbonator";
}

function getDay7Subject(product) {
  switch (product) {
    case "pour":
      return "Ready to unlock Pour? $20, no subscription.";
    case "ontap":
      return "Ready to unlock On Tap? $20, no subscription.";
    case "desipper":
      return "Ready to unlock De-Sipper? $25, no subscription.";
    default:
      return "Ready to go full version? $20, no subscription.";
  }
}

function buildDay7Email(email, product) {
  const productInfo = {
    carbonator: {
      name: "Carbonator",
      color: "#ff6b2b",
      accentGradient: "linear-gradient(135deg,#ff6b2b,#ff3366)",
      price: "$20",
      buyUrl: "https://carbonatedaudio.com/carbonator",
      features: [
        "All 5 flavors + Carbonated mode",
        "Unlimited offline rendering",
        "Use on up to 3 machines",
        "Free updates for life",
        "No subscription — pay once, own forever",
      ],
      quote: "The Lemon-Lime on my vocal chain is crazy. An absolute staple.",
      quoteAuthor: "— ZakMabry, Carbonator user",
    },
    desipper: {
      name: "De-Sipper",
      color: "#00d4ff",
      accentGradient: "linear-gradient(135deg,#00d4ff,#0099cc)",
      price: "$25",
      buyUrl: "https://carbonatedaudio.com/desipper",
      features: [
        "Full split-band de-essing",
        "Listen mode for precision control",
        "Unlimited offline rendering",
        "Use on up to 3 machines",
        "No subscription — pay once, own forever",
      ],
      quote: "Finally a de-esser that doesn't make my vocals sound dull.",
      quoteAuthor: "— De-Sipper user",
    },
    ontap: {
      name: "On Tap",
      color: "#a855f7",
      accentGradient: "linear-gradient(135deg,#a855f7,#7c3aed)",
      price: "$20",
      buyUrl: "https://carbonatedaudio.com/ontap",
      features: [
        "All 16 ducking curves",
        "3 trigger modes — Sync, MIDI, Audio",
        "Band-split crossover filter",
        "Unlimited offline rendering",
        "No subscription — pay once, own forever",
      ],
      quote: "Sidechain without the routing headache. This is how it should work.",
      quoteAuthor: "— On Tap user",
    },
    pour: {
      name: "Pour",
      color: "#4fb8d4",
      accentGradient: "linear-gradient(135deg,#4fb8d4,#2a88a8)",
      price: "$20",
      buyUrl: "https://carbonatedaudio.com/pour",
      features: [
        "Full M/S stereo imaging controls",
        "Shuffle + Space (Blumlein shuffling)",
        "Live polar vectorscope",
        "Use on up to 3 machines",
        "No subscription — pay once, own forever",
      ],
      quote: "Wider low end without killing mono compatibility — finally.",
      quoteAuthor: "— Pour user",
    },
  };

  const info = productInfo[product] || productInfo.carbonator;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0a1a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0a1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:28px;font-weight:800;color:#ffffff;">Carbonated Audio</span>
        </td></tr>

        <tr><td style="background-color:#1a1430;border-radius:16px;padding:40px 32px;">

          <h1 style="color:#ffffff;font-size:22px;margin:0 0 16px;">Tired of the demo limit?</h1>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 20px;">
            If you've been using the ${info.name} demo, you've probably hit the mute cycle a few times by now. The full version removes it completely — unlimited rendering, no interruptions.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="background:#0d0a1a;border-radius:10px;padding:20px;border:1px solid #2a2440;">
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#a09bb5;">
                ${info.features.map((f) => `<tr><td style="padding:6px 0;"><span style="color:#10b981;">✓</span> ${f}</td></tr>`).join("")}
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="background:#0d0a1a;border-radius:10px;padding:16px 20px;border:1px solid #2a2440;">
              <p style="color:#ffffff;font-size:14px;font-style:italic;line-height:1.6;margin:0 0 8px;">
                "${info.quote}"
              </p>
              <p style="color:#6b6580;font-size:13px;margin:0;">${info.quoteAuthor}</p>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr><td align="center">
              <a href="${info.buyUrl}" style="display:inline-block;padding:16px 40px;background:${info.accentGradient};color:#ffffff;text-decoration:none;border-radius:8px;font-size:18px;font-weight:700;">
                Get ${info.name} — ${info.price}
              </a>
            </td></tr>
          </table>

          <p style="color:#6b6580;font-size:13px;text-align:center;margin:0 0 24px;">
            One-time purchase. No subscription. Use on 3 machines.
          </p>

          <hr style="border:none;border-top:1px solid #2a2440;margin:0 0 24px;">

          <p style="color:#a09bb5;font-size:14px;text-align:center;margin:0;">
            Want all 4 plugins? Grab the <a href="${BUNDLE_URL}" style="color:#4ecca3;text-decoration:none;font-weight:600;">Complete Bundle for $60</a> — save $25.
          </p>

        </td></tr>

        <tr><td align="center" style="padding-top:32px;">
          <p style="color:#6b6580;font-size:12px;margin:0;">
            &copy; ${new Date().getFullYear()} Carbonated Audio &middot; <a href="https://carbonatedaudio.com" style="color:#6b6580;">carbonatedaudio.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
