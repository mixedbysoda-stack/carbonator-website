// Drip Email 2 — Day 3 nudge (product-aware)
// Trigger: Netlify scheduled function, runs daily.
// Finds leads where email1 was sent 3+ days ago but no email2 yet.

const { getBlobStore } = require("./lib/store");
const { isSuppressed } = require("./lib/suppression");
const { loadBuyerEmails } = require("./lib/buyers");
const { Resend } = require("resend");
const { PRODUCTS } = require("./config");
const { buildEmail, PRODUCT_ACCENTS } = require("../../email-templates/render");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const BUNDLE_URL = "https://buy.stripe.com/3cI7sL2kpaxcdPX1YL3oA0h?prefilled_promo_code=ALL6FOR45&utm_source=lead_drip&utm_medium=email&utm_campaign=september_bundle&utm_content=day3";
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

const SUBJECTS = {
  carbonator: "How's the Carbonator demo treating you? 🎛️",
  desipper: "How's the De-Sipper demo treating you? 🎤",
  ontap: "How's On Tap working out? 🎚️",
  pour: "How's the Pour demo treating you? 🌊",
  fizzfuel: "Still thinking about FIZZFUEL? 🏁",
  still: "The Still trick most people miss 🎧",
};

const SPOTLIGHT = {
  fizzfuel: {
    headline: "FIZZFUEL is ready to throw in gear",
    body: `<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">FIZZFUEL is live. It puts Drive, Reverb, Delay, Pitch, and Filter behind one manual gearbox, so changing the energy of a track does not mean opening five separate plugins.</p>
           <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">Here’s what to try first:</p>`,
    features: [
      "<strong style=\"color:#ffffff;\">6 gears</strong> — Drive, Reverb, Delay, Pitch, Filter + clean A/B",
      "<strong style=\"color:#ffffff;\">20+ styles</strong> — from tape warmth to shimmer and self-oscillating echoes",
      "<strong style=\"color:#ffffff;\">The shifter</strong> — throw the stick, glitch-free crossfades between effects",
    ],
    ctaText: "Hear FIZZFUEL in action",
    ctaUrl: "https://carbonatedaudio.com/fizzfuel?utm_source=lead_drip&utm_medium=email&utm_campaign=fizzfuel_day3&utm_content=primary_cta",
  },
  still: {
    headline: "One dial — but here's the trick",
    body: `<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">Hope Still is already sitting quietly on your noisy tracks. Quick tip that most people miss: <strong style="color:#ffffff;">flip on &Delta; NOISE</strong> and Still solos exactly what it's removing. If all you hear is hiss and room tone, your dial is set right. If you hear voice in there, back the dial off a touch.</p>
           <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">That's the whole workflow — set the dial, sanity-check with &Delta; NOISE, done:</p>`,
    features: [
      "<strong style=\"color:#ffffff;\">&Delta; NOISE solo</strong> — hear only what's being removed, never guess",
      "<strong style=\"color:#ffffff;\">One dial</strong> — push until the noise is gone, back off if the source dulls",
      "<strong style=\"color:#ffffff;\">Zero added latency</strong> — leave it on while tracking or mixing",
    ],
    ctaText: "Cleaning a vocal? Meet De-Sipper",
    ctaUrl: "https://carbonatedaudio.com/desipper?utm_source=still_email&utm_medium=email&utm_campaign=still_day3",
    footnote: `<p style="color:#a09bb5;font-size:14px;line-height:1.7;margin:16px 0 0;">Still handles the noise, but sibilance is a different job — <a href="https://carbonatedaudio.com/desipper?utm_source=still_email&utm_medium=email&utm_campaign=still_day3" style="color:#00d4ff;text-decoration:none;font-weight:600;">De-Sipper ($20)</a> finishes the vocal cleanup.</p>`,
  },
  carbonator: {
    headline: "How's the demo going so far?",
    body: `<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">Just checking in — have you had a chance to drop Carbonator on a track yet? I'd love to hear what you think.</p>
           <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">Quick reminder on what each flavor does, in case you haven't tried them all:</p>`,
    features: [
      "<strong style=\"color:#ffffff;\">Cola</strong> on drums — instant warmth, no mud",
      "<strong style=\"color:#ffffff;\">Grape</strong> on vocals — lo-fi character producers love",
      "<strong style=\"color:#ffffff;\">Lemon-Lime</strong> on hi-hats — air and sparkle without harshness",
      "<strong style=\"color:#ffffff;\">Orange</strong> on bass · <strong style=\"color:#ffffff;\">Cream Soda</strong> on master bus",
    ],
    ctaText: "Download Carbonator Demo",
  },
  desipper: {
    headline: "How's the De-Sipper demo going?",
    body: `<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">Just checking in — have you run De-Sipper on a vocal yet? Curious what you're hearing.</p>
           <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">What makes it stand out:</p>`,
    features: [
      "<strong style=\"color:#ffffff;\">Split-band processing</strong> — only touches sibilant frequencies",
      "<strong style=\"color:#ffffff;\">Listen mode</strong> — solo exactly what's being removed",
      "<strong style=\"color:#ffffff;\">Zero latency</strong> — works in real-time for tracking and mixing",
    ],
    ctaText: "Download De-Sipper Demo",
  },
  ontap: {
    headline: "How's On Tap working out?",
    body: `<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">Just checking in — had a chance to drop On Tap on your bass or pads yet?</p>
           <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">If you're still exploring, here's what to try:</p>`,
    features: [
      "<strong style=\"color:#ffffff;\">16 ducking curves</strong> — from subtle pump to deep sidechain grooves",
      "<strong style=\"color:#ffffff;\">3 trigger modes</strong> — sync to DAW, MIDI, or audio input",
      "<strong style=\"color:#ffffff;\">Band-split crossover</strong> — duck only the frequencies you want",
    ],
    ctaText: "Download On Tap Demo",
  },
  pour: {
    headline: "How's the Pour demo going?",
    body: `<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">Just checking in — have you dropped Pour on a stereo bus yet? Would love to hear what you think.</p>
           <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">Quick tour of the controls:</p>`,
    features: [
      "<strong style=\"color:#ffffff;\">Shuffle + Space</strong> — Blumlein bass stereo shuffling for wider lows",
      "<strong style=\"color:#ffffff;\">Width, Rotation, Asymmetry</strong> — full M/S shaping control",
      "<strong style=\"color:#ffffff;\">Live vectorscope</strong> — see the stereo field in real time",
    ],
    ctaText: "Download Pour Demo",
  },
};

function getProductFromSource(source) {
  if (!source) return "carbonator";
  const s = source.toLowerCase();
  if (s.includes("still")) return "still";
  if (s.includes("fizzfuel") || s.includes("octane")) return "fizzfuel";
  if (s.includes("pour")) return "pour";
  if (s.includes("ontap")) return "ontap";
  if (s.includes("desipper")) return "desipper";
  return "carbonator";
}

// Only live, sellable products belong in the "Also from Carbonated Audio" list
const LIVE_PRODUCTS = ["carbonator", "desipper", "ontap", "pour", "fizzfuel", "still"];

function buildDay3Body(product, contact) {
  const sp = SPOTLIGHT[product] || SPOTLIGHT.carbonator;
  const pacc = PRODUCT_ACCENTS[product] || PRODUCT_ACCENTS.carbonator;
  const demoUrl = sp.ctaUrl || PRODUCTS[product]?.downloads?.mac || pacc.url;
  const otherProducts = LIVE_PRODUCTS
    .filter((k) => k !== product && PRODUCT_ACCENTS[k])
    .map((k) => {
      const p = PRODUCT_ACCENTS[k];
      return `<a href="${p.url}" style="color:${p.color};text-decoration:none;font-weight:600;">${p.name}</a>`;
    })
    .join(" &middot; ");

  const extraBody = `
    ${sp.body}
    ${sp.footnote || ""}
  `;
  const appendix = `
    <hr style="border:none;border-top:1px solid #2a2440;margin:28px 0;">
    <p style="color:#a09bb5;font-size:14px;line-height:1.7;margin:0 0 8px;">
      <strong style="color:#ffffff;">Also from Carbonated Audio:</strong>
    </p>
    <p style="color:#a09bb5;font-size:14px;line-height:1.7;margin:0 0 16px;">${otherProducts}</p>
    <p style="color:#a09bb5;font-size:14px;line-height:1.7;margin:0;">
      Through September 30, get all 6 Carbonated Audio plugins for <a href="${BUNDLE_URL}" style="color:#4ecca3;text-decoration:none;font-weight:600;">$45</a> &mdash; normally $109, save $64.
    </p>
  `;

  return buildEmail("spotlight", {
    product,
    headline: sp.headline,
    body: extraBody + appendix,
    features: sp.features,
    ctaText: sp.ctaText,
    ctaUrl: demoUrl,
    signatureName: "Soda",
    preheader: `Checking in on the ${pacc.name} demo`,
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

  // Never drip purchase pitches at people who already bought. A lead who
  // converts stays in the leads store forever, so without this they keep
  // getting "buy it for $20" mail for a plugin they own (observed on the
  // APD bundle buyers, Jul 2026).
  const buyerEmails = await loadBuyerEmails();

  let sent = 0;
  const results = [];

  for (const blob of blobs) {
    try {
      const lead = await store.get(blob.key, { type: "json" });
      if (!lead || !lead.contact) continue;
      if (isSuppressed(lead.contact)) continue; // unsubscribed
      if (buyerEmails.has(String(lead.contact).trim().toLowerCase())) continue; // already a customer
      if (lead.drip_status !== "email1_sent") continue;
      if (!lead.email1_sent_at) continue;
      const elapsed = now - new Date(lead.email1_sent_at).getTime();
      if (elapsed < THREE_DAYS) continue;

      const product = getProductFromSource(lead.source);
      await resend.emails.send({
        from: FROM_EMAIL,
        reply_to: "mixedbysoda@gmail.com",
        to: lead.contact,
        subject: SUBJECTS[product] || SUBJECTS.carbonator,
        html: buildDay3Body(product, lead.contact),
      });

      lead.drip_status = "email2_sent";
      lead.email2_sent_at = new Date().toISOString();
      await store.setJSON(blob.key, lead);

      sent++;
      results.push(`Day 3 email sent to ${lead.contact} (${product})`);
    } catch (err) {
      console.error(`Day 3 email failed for ${blob.key}:`, err.message);
    }
  }

  if (sent > 0) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: "mixedbysoda@gmail.com",
        subject: `📧 Drip Day 3: ${sent} follow-up${sent > 1 ? "s" : ""} sent`,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;">
          <h2 style="color:#ff6b2b;">Drip Day 3 Report</h2>
          <p><strong>${sent}</strong> follow-up email${sent > 1 ? "s" : ""} sent:</p>
          <ul>${results.map((r) => `<li>${r}</li>`).join("")}</ul>
        </div>`,
      });
    } catch (e) {
      console.error("Drip report failed:", e.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ sent, results }) };
};
