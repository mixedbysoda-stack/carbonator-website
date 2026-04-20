// Drip Email 2 — Day 3 nudge (product-aware)
// Trigger: Netlify scheduled function — runs daily
// Finds leads where email1 was sent 3+ days ago but no email2 yet

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
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  let sent = 0;
  const results = [];

  for (const blob of blobs) {
    try {
      const lead = await store.get(blob.key, { type: "json" });
      if (!lead || !lead.contact) continue;
      if (lead.drip_status !== "email1_sent") continue;
      if (!lead.email1_sent_at) continue;

      const elapsed = now - new Date(lead.email1_sent_at).getTime();
      if (elapsed < THREE_DAYS) continue;

      // Determine product from source
      const product = getProductFromSource(lead.source);

      await resend.emails.send({
        from: FROM_EMAIL,
        to: lead.contact,
        subject: getDay3Subject(product),
        html: buildDay3Email(lead.contact, product),
      });

      // Update status
      lead.drip_status = "email2_sent";
      lead.email2_sent_at = new Date().toISOString();
      await store.setJSON(blob.key, lead);

      sent++;
      results.push(`Day 3 email sent to ${lead.contact} (${product})`);
      console.log(`Day 3 email sent to ${lead.contact} (${product})`);
    } catch (err) {
      console.error(`Day 3 email failed for ${blob.key}:`, err.message);
    }
  }

  // Notify about drip activity
  if (sent > 0) {
    try {
      const resend2 = new Resend(process.env.RESEND_API_KEY);
      await resend2.emails.send({
        from: FROM_EMAIL,
        to: "mixedbysoda@gmail.com",
        subject: `📧 Drip Day 3: ${sent} follow-up${sent > 1 ? "s" : ""} sent`,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;">
          <h2 style="color:#ff6b2b;">Drip Day 3 Report</h2>
          <p><strong>${sent}</strong> follow-up email${sent > 1 ? "s" : ""} sent:</p>
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

function getDay3Subject(product) {
  switch (product) {
    case "pour":
      return "How's the Pour demo treating you? 🌊";
    case "ontap":
      return "How's On Tap working out? 🎚️";
    case "desipper":
      return "How's the De-Sipper demo treating you? 🎤";
    default:
      return "How's the Carbonator demo treating you? 🎛️";
  }
}

function buildDay3Email(email, product) {
  const productInfo = {
    carbonator: {
      name: "Carbonator",
      color: "#ff6b2b",
      tagline: "analog saturation with 5 circuit-modeled flavors",
      demoUrl: "https://carbonatedaudio.com/Carbonator%20DEMO.zip",
      buyUrl: "https://carbonatedaudio.com/carbonator",
      price: "$20",
      highlights: `
        <tr><td style="padding:6px 0;"><strong style="color:#ff6b2b;">🥤 Cola on drums</strong> — Instant warmth without the mud.</td></tr>
        <tr><td style="padding:6px 0;"><strong style="color:#cc33ff;">🍇 Grape on vocals</strong> — That lo-fi character producers love.</td></tr>
        <tr><td style="padding:6px 0;"><strong style="color:#ffd700;">🍋 Lemon-Lime on hi-hats</strong> — Adds air and sparkle without harshness.</td></tr>`,
    },
    desipper: {
      name: "De-Sipper",
      color: "#00d4ff",
      tagline: "transparent de-essing that tames sibilance without killing brightness",
      demoUrl: PRODUCTS.desipper.downloads.mac,
      buyUrl: "https://carbonatedaudio.com/desipper",
      price: "$25",
      highlights: `
        <tr><td style="padding:6px 0;"><strong style="color:#00d4ff;">Split-Band Processing</strong> — Only touches sibilant frequencies.</td></tr>
        <tr><td style="padding:6px 0;"><strong style="color:#00d4ff;">Listen Mode</strong> — Solo exactly what's being removed.</td></tr>
        <tr><td style="padding:6px 0;"><strong style="color:#00d4ff;">Zero Latency</strong> — Works in real-time for tracking and mixing.</td></tr>`,
    },
    ontap: {
      name: "On Tap",
      color: "#a855f7",
      tagline: "instant sidechain ducking with 16 hand-crafted curves",
      demoUrl: PRODUCTS.ontap.downloads.mac,
      buyUrl: "https://carbonatedaudio.com/ontap",
      price: "$20",
      highlights: `
        <tr><td style="padding:6px 0;"><strong style="color:#a855f7;">16 Ducking Curves</strong> — From subtle pump to deep sidechain grooves.</td></tr>
        <tr><td style="padding:6px 0;"><strong style="color:#a855f7;">3 Trigger Modes</strong> — Sync to DAW, MIDI, or audio input.</td></tr>
        <tr><td style="padding:6px 0;"><strong style="color:#a855f7;">Band-Split Crossover</strong> — Duck only the frequencies you want.</td></tr>`,
    },
    pour: {
      name: "Pour",
      color: "#4fb8d4",
      tagline: "M/S stereo imaging with a live polar vectorscope",
      demoUrl: PRODUCTS.pour.downloads.mac,
      buyUrl: "https://carbonatedaudio.com/pour",
      price: "$20",
      highlights: `
        <tr><td style="padding:6px 0;"><strong style="color:#4fb8d4;">Shuffle + Space</strong> — Blumlein bass stereo shuffling for wider lows.</td></tr>
        <tr><td style="padding:6px 0;"><strong style="color:#4fb8d4;">Width, Rotation, Asymmetry</strong> — Full M/S shaping control.</td></tr>
        <tr><td style="padding:6px 0;"><strong style="color:#4fb8d4;">Live Vectorscope</strong> — See the stereo field in real time.</td></tr>`,
    },
  };

  const info = productInfo[product] || productInfo.carbonator;

  // Build "also check out" section for other products
  const otherProducts = Object.entries(productInfo)
    .filter(([key]) => key !== product)
    .map(
      ([, p]) =>
        `<a href="${p.buyUrl}" style="color:${p.color};text-decoration:none;font-weight:600;">${p.name}</a> — ${p.tagline}`
    )
    .join("<br>");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0a1a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0a1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:28px;font-weight:800;color:#ffffff;">Carbonated Audio</span>
        </td></tr>

        <tr><td style="background-color:#1a1430;border-radius:16px;padding:40px 32px;">

          <h1 style="color:#ffffff;font-size:22px;margin:0 0 16px;">How's the demo going?</h1>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 20px;">
            Just checking in — have you had a chance to try ${info.name} yet? I'd love to hear what you think so far.
          </p>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 20px;">
            Here's what makes ${info.name} stand out:
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="background:#0d0a1a;border-radius:10px;padding:20px;border:1px solid #2a2440;">
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#a09bb5;">
                ${info.highlights}
              </table>
            </td></tr>
          </table>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Haven't installed it yet? No worries — here's your download link again:
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${info.demoUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${info.color},${info.color}cc);color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">
                Download ${info.name} Demo
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">

          <p style="color:#a09bb5;font-size:14px;line-height:1.7;margin:0 0 12px;">
            <strong style="color:#ffffff;">Also from Carbonated Audio:</strong><br>
            ${otherProducts}
          </p>

          <p style="color:#a09bb5;font-size:14px;line-height:1.7;margin:16px 0 0;">
            Or grab all 4 plugins in our <a href="${BUNDLE_URL}" style="color:#4ecca3;text-decoration:none;font-weight:600;">Complete Bundle for $60</a> (save $25).
          </p>

          <hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">

          <p style="color:#6b6580;font-size:13px;text-align:center;margin:0;">
            Questions? Just reply — I read every email.
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
