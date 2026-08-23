// Drip Email 3 — Day 7 conversion push (product-aware)
// Trigger: Netlify scheduled function, runs daily.
// Finds leads where email2 was sent 4+ days ago (7 days from signup) but no email3 yet.

const { getBlobStore } = require("./lib/store");
const { sendEmail } = require("./lib/mailer");
const { isSuppressedAsync } = require("./lib/suppression");
const { loadBuyerEmails } = require("./lib/buyers");
const { Resend } = require("resend");
const { PRODUCTS } = require("./config");
const { buildEmail, PRODUCT_ACCENTS } = require("../../email-templates/render");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const BUNDLE_URL = "https://buy.stripe.com/3cI7sL2kpaxcdPX1YL3oA0h?prefilled_promo_code=ALL6FOR45&utm_source=lead_drip&utm_medium=email&utm_campaign=september_bundle&utm_content=day7";
const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;

const SUBJECTS = {
  carbonator: "Ready to unlock Carbonator? $20, no subscription.",
  desipper: "Ready to unlock De-Sipper? $20, no subscription.",
  ontap: "Ready to unlock On Tap? $20, no subscription.",
  pour: "Ready to unlock Pour? $20, no subscription.",
  fizzfuel: "FIZZFUEL — 6 effects, one shifter, $29.",
  still: "Still was step one. Here's the rest of the chain.",
  tallboy: "Ready to unlock TALLBOY? $20, no subscription.",
};

const CONVERT = {
  tallboy: {
    headline: "Tired of the 60-second cycle? Unlock TALLBOY.",
    features: [
      "All three cartridges — CHIP, ARP and CRUSH ROM — with every preset",
      "No more 10-second mutes, unlimited offline rendering",
      "Use on up to 3 machines",
      "macOS VST3 / AU / AAX and Windows VST3",
      "No subscription — pay once, own forever",
    ],
    quote: "Your track, played back on a handheld.",
    quoteAuthor: "— the TALLBOY tagline",
    priceLine: "$20 one-time",
    ctaUrl: "https://carbonatedaudio.com/tallboy?utm_source=lead_drip&utm_medium=email&utm_campaign=tallboy_day7&utm_content=primary_cta",
  },
  fizzfuel: {
    headline: "Six effects. One shifter. Ready when you are.",
    features: [
      "All 6 effect gears — Drive, Reverb, Delay, Pitch, Filter + clean A/B",
      "20+ styles across the effects",
      "Tempo-synced delay, FDN reverb, real-time pitch",
      "Use on up to 3 machines",
      "No subscription — pay once, own forever",
    ],
    quote: "Six effects. One shifter. Throw it in gear.",
    quoteAuthor: "— the FIZZFUEL motto",
    priceLine: "$29 one-time",
  },
  still: {
    headline: "The vocal chain, in order: Still → De-Sipper → Carbonator",
    body: `
    <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">
      A week in, Still should have the hiss and room tone handled — for free, forever.
      But noise is only step one of a clean vocal. The full chain looks like this:
    </p>
    <p style="color:#a09bb5;font-size:15px;line-height:1.8;margin:0 0 16px;">
      <strong style="color:#6fc7bc;">1. Still (free)</strong> — kills the noise floor.<br>
      <strong style="color:#00d4ff;">2. De-Sipper ($20)</strong> — tames the sibilance the cleanup exposes.<br>
      <strong style="color:#ff6b2b;">3. Carbonator ($20)</strong> — adds the analog warmth and presence.
    </p>
    <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">
      Quiet, smooth, warm — in that order. Each one is a one-time purchase, no subscription, use on up to 3 machines.
    </p>
    `,
    features: [
      "Still — adaptive noise floor removal, zero latency, free",
      "De-Sipper — split-band de-essing with Listen mode, $20",
      "Carbonator — 5 circuit-modeled saturation flavors, $20",
      "No subscriptions — pay once, own forever",
    ],
    quote: "Finally a de-esser that doesn't make my vocals sound dull.",
    quoteAuthor: "— De-Sipper user",
    priceLine: "De-Sipper $20 · Carbonator $20 — or the whole catalog below",
    ctaText: "Get De-Sipper — $20",
    ctaUrl: "https://carbonatedaudio.com/desipper?utm_source=still_email&utm_medium=email&utm_campaign=still_day7",
  },
  carbonator: {
    headline: "Tired of the demo cycle? Unlock the full version.",
    features: [
      "All 5 flavors + Carbonated mode",
      "Unlimited offline rendering (no mute cycle)",
      "Use on up to 3 machines",
      "Free updates for life",
      "No subscription — pay once, own forever",
    ],
    quote: "The Lemon-Lime on my vocal chain is crazy. An absolute staple.",
    quoteAuthor: "— ZakMabry",
    priceLine: "$20 one-time",
  },
  desipper: {
    headline: "Tired of the demo cycle? Unlock De-Sipper.",
    features: [
      "Full split-band de-essing",
      "Listen mode for precision control",
      "Unlimited offline rendering",
      "Use on up to 3 machines",
      "No subscription — pay once, own forever",
    ],
    quote: "Finally a de-esser that doesn't make my vocals sound dull.",
    quoteAuthor: "— De-Sipper user",
    priceLine: "$20 one-time",
  },
  ontap: {
    headline: "Tired of the demo cycle? Unlock On Tap.",
    features: [
      "All 16 ducking curves",
      "3 trigger modes — Sync, MIDI, Audio",
      "Band-split crossover filter",
      "Unlimited offline rendering",
      "No subscription — pay once, own forever",
    ],
    quote: "Sidechain without the routing headache. This is how it should work.",
    quoteAuthor: "— On Tap user",
    priceLine: "$20 one-time",
  },
  pour: {
    headline: "Tired of the demo cycle? Unlock Pour.",
    features: [
      "Full M/S stereo imaging controls",
      "Shuffle + Space (Blumlein shuffling)",
      "Live polar vectorscope",
      "Use on up to 3 machines",
      "No subscription — pay once, own forever",
    ],
    quote: "Wider low end without killing mono compatibility — finally.",
    quoteAuthor: "— Pour user",
    priceLine: "$20 one-time",
  },
};

function getProductFromSource(source) {
  if (!source) return "carbonator";
  const s = source.toLowerCase();
  if (s.includes("still")) return "still";
  if (s.includes("tallboy")) return "tallboy";
  if (s.includes("fizzfuel") || s.includes("octane")) return "fizzfuel";
  if (s.includes("pour")) return "pour";
  if (s.includes("ontap")) return "ontap";
  if (s.includes("desipper")) return "desipper";
  return "carbonator";
}

function buildDay7Body(product) {
  const c = CONVERT[product] || CONVERT.carbonator;
  const pacc = PRODUCT_ACCENTS[product] || PRODUCT_ACCENTS.carbonator;
  const buyUrl = c.ctaUrl || pacc.url;

  // Still is free — no demo/mute cycle. Use its own vocal-chain narrative instead.
  const intro = c.body || `
    <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">
      If you've been running the ${pacc.name} demo, you've probably hit the mute cycle by now.
      The full version removes it completely — unlimited rendering, no interruptions.
    </p>
  `;

  const body = `
    ${intro}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 20px;">
      <tr>
        <td style="background:#120e22;border:1px solid #2a2440;border-radius:10px;padding:18px;">
          <p style="color:#ffffff;font-size:14px;font-style:italic;line-height:1.6;margin:0 0 6px;">&ldquo;${c.quote}&rdquo;</p>
          <p style="color:#6b6580;font-size:12px;margin:0;">${c.quoteAuthor}</p>
        </td>
      </tr>
    </table>
    <p style="color:${pacc.color};font-size:13px;font-weight:700;letter-spacing:0.3px;margin:0 0 8px;">
      ${c.priceLine}
    </p>
  `;

  const appendix = `
    <hr style="border:none;border-top:1px solid #2a2440;margin:28px 0;">
    <p style="color:#a09bb5;font-size:14px;line-height:1.7;margin:0;text-align:center;">
      Want the full toolkit? Grab
      <a href="${BUNDLE_URL}" style="color:#4ecca3;text-decoration:none;font-weight:600;">all 6 plugins for $45</a>
      through September 30 &mdash; normally $109, save $64.
    </p>
  `;

  return buildEmail("spotlight", {
    product,
    headline: c.headline,
    body: body + appendix,
    features: c.features,
    ctaText: c.ctaText || `Get ${pacc.name} — $${pacc.price}`,
    ctaUrl: buyUrl,
    signatureName: "Soda",
    preheader: c.preheader || (product === "still"
      ? "Still → De-Sipper → Carbonator — the full vocal chain"
      : `Full ${pacc.name} for $${pacc.price} — no subscription`),
  });
}

exports.handler = async () => {
  if (!process.env.RESEND_API_KEY) {
    return { statusCode: 200, body: "No RESEND_API_KEY — skipping" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const store = getBlobStore("leads");
  const { blobs } = await store.list();
  const now = Date.now();

  // Never drip purchase pitches at people who already bought — see lib/buyers.js.
  const buyerEmails = await loadBuyerEmails();

  let sent = 0;
  const results = [];

  for (const blob of blobs) {
    try {
      const lead = await store.get(blob.key, { type: "json" });
      if (!lead || !lead.contact) continue;
      if (await isSuppressedAsync(lead.contact)) continue; // unsubscribed, bounced, or complained
      if (buyerEmails.has(String(lead.contact).trim().toLowerCase())) continue; // already a customer
      if (lead.drip_status !== "email2_sent") continue;
      if (!lead.email2_sent_at) continue;
      const elapsed = now - new Date(lead.email2_sent_at).getTime();
      if (elapsed < FOUR_DAYS) continue;

      const product = getProductFromSource(lead.source);
      await sendEmail(resend, {
        from: FROM_EMAIL,
        reply_to: "mixedbysoda@gmail.com",
        to: lead.contact,
        subject: SUBJECTS[product] || SUBJECTS.carbonator,
        html: buildDay7Body(product),
      });

      lead.drip_status = "email3_sent";
      lead.email3_sent_at = new Date().toISOString();
      await store.setJSON(blob.key, lead);

      sent++;
      results.push(`Day 7 email sent to ${lead.contact} (${product})`);
    } catch (err) {
      console.error(`Day 7 email failed for ${blob.key}:`, err.message);
    }
  }

  if (sent > 0) {
    try {
      await sendEmail(resend, {
        from: FROM_EMAIL,
        to: "mixedbysoda@gmail.com",
        subject: `📧 Drip Day 7: ${sent} conversion email${sent > 1 ? "s" : ""} sent`,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;">
          <h2 style="color:#ff6b2b;">Drip Day 7 Report</h2>
          <p><strong>${sent}</strong> conversion email${sent > 1 ? "s" : ""} sent:</p>
          <ul>${results.map((r) => `<li>${r}</li>`).join("")}</ul>
        </div>`,
      });
    } catch (e) {
      console.error("Drip report failed:", e.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ sent, results }) };
};
