// Drip Email 2 — Day 3 nudge (product-aware)
// Trigger: Netlify scheduled function, runs daily.
// Finds leads where email1 was sent 3+ days ago but no email2 yet.

const { sendEmail } = require("./lib/mailer");
const { loadBuyerEmailsCached } = require("./lib/buyers");
const { runDripPass } = require("./lib/drip-scan");
const { syncLeadStatusToGoogleSheets } = require("./lib/google-sheets");
const { Resend } = require("resend");
const { PRODUCTS } = require("./config");
const { buildEmail, PRODUCT_ACCENTS } = require("../../email-templates/render");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const BUNDLE_URL = "https://buy.stripe.com/dRmbJ16AFbBgcLT6f13oA0k?utm_source=lead_drip&utm_medium=email&utm_campaign=all7_bundle&utm_content=day3";
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

// Audio Plugin Deals exclusive window (2026-08-31 to 2026-09-13, padded a day
// each side): the discounted bundle pitch is dropped from every drip sent while
// it is active. Same dates as components/apd-window.js; the build guard checks.
const APD_START = Date.parse("2026-08-30T00:00:00Z");
const APD_END = Date.parse("2026-09-14T23:59:59Z");
const apdWindowActive = () => Date.now() >= APD_START && Date.now() <= APD_END;

const SUBJECTS = {
  carbonator: "How's the Carbonator demo treating you? 🎛️",
  desipper: "How's the De-Sipper demo treating you? 🎤",
  ontap: "How's On Tap working out? 🎚️",
  pour: "How's the Pour demo treating you? 🌊",
  fizzfuel: "Still thinking about FIZZFUEL? 🏁",
  still: "The Still trick most people miss 🎧",
  tallboy: "How's the TALLBOY demo treating you? 🎮",
};

const SPOTLIGHT = {
  tallboy: {
    headline: "How's the TALLBOY demo going?",
    body: `<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">Just checking in — have you fed TALLBOY a vocal or a bass line yet? It tracks the pitch and replays the part on a four-channel handheld sound chip, so it needs a single note to lock onto.</p>
           <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">Three things to try while the demo is open:</p>`,
    features: [
      "<strong style=\"color:#ffffff;\">4BIT CHOIR</strong> on a vocal double — the chip voice sits behind the real one",
      "<strong style=\"color:#ffffff;\">ARP on, CHRD mode</strong> — a hook becomes a counter-melody",
      "<strong style=\"color:#ffffff;\">CRUSH ROM alone</strong> on drums — eject CHIP and ARP, keep the decimator",
    ],
    ctaText: "Hear TALLBOY in action",
    ctaUrl: "https://carbonatedaudio.com/tallboy?utm_source=lead_drip&utm_medium=email&utm_campaign=tallboy_day3&utm_content=primary_cta",
  },
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
  if (s.includes("tallboy")) return "tallboy";
  if (s.includes("fizzfuel") || s.includes("octane")) return "fizzfuel";
  if (s.includes("pour")) return "pour";
  if (s.includes("ontap")) return "ontap";
  if (s.includes("desipper")) return "desipper";
  return "carbonator";
}

// Only live, sellable products belong in the "Also from Carbonated Audio" list
const LIVE_PRODUCTS = ["carbonator", "desipper", "ontap", "pour", "fizzfuel", "tallboy", "still"];

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
    ${apdWindowActive() ? "" : `<p style="color:#a09bb5;font-size:14px;line-height:1.7;margin:0;">
      Get all 7 Carbonated Audio plugins for <a href="${BUNDLE_URL}" style="color:#4ecca3;text-decoration:none;font-weight:600;">$55</a> &mdash; individually $129, save $74.
    </p>`}
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
  const now = Date.now();

  // Never drip purchase pitches at people who already bought. A lead who
  // converts stays in the leads store forever, so without this they keep
  // getting "buy it for $20" mail for a plugin they own (observed on the
  // APD bundle buyers, Jul 2026).
  const buyerEmails = await loadBuyerEmailsCached();

  // The walk, the suppression load, the time budget and the send-claim all live
  // in lib/drip-scan.js — see that file for why this pass used to die partway
  // through and silently leave the newest leads unserved.
  const pass = await runDripPass({
    label: "Day 3",
    buyerEmails,
    claimField: "email2_attempted_at",
    isDue: (lead) =>
      lead.drip_status === "email1_sent" &&
      Boolean(lead.email1_sent_at) &&
      now - new Date(lead.email1_sent_at).getTime() >= THREE_DAYS,
    send: async (lead) => {
      const product = getProductFromSource(lead.source);
      await sendEmail(resend, {
        from: FROM_EMAIL,
        reply_to: "mixedbysoda@gmail.com",
        to: lead.contact,
        subject: SUBJECTS[product] || SUBJECTS.carbonator,
        html: buildDay3Body(product, lead.contact),
      });
    },
    markSent: (lead) => {
      const sentAt = new Date().toISOString();
      // Keep the reporting view in step with reality. Without this the Sheet
      // still shows whatever this lead was at capture time.
      syncLeadStatusToGoogleSheets({ ...lead, drip_status: "email2_sent" }).catch((err) =>
        console.error(`Sheet status sync failed for ${lead.contact} (non-fatal):`, err.message)
      );
      return { drip_status: "email2_sent", email2_sent_at: sentAt };
    },
  });

  const sent = pass.sent;
  const results = pass.results;

  if (sent > 0 || pass.stoppedEarly) {
    try {
      await sendEmail(resend, {
        from: FROM_EMAIL,
        to: "mixedbysoda@gmail.com",
        subject: pass.stoppedEarly
          ? `⚠️ Drip Day 3: ${sent} sent, pass stopped early`
          : `📧 Drip Day 3: ${sent} follow-up${sent === 1 ? "" : "s"} sent`,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;">
          <h2 style="color:#ff6b2b;">Drip Day 3 Report</h2>
          <p><strong>${sent}</strong> follow-up email${sent === 1 ? "" : "s"} sent, ${pass.failed} failed.</p>
          ${pass.stoppedEarly
            ? `<p style="color:#ffb020;">Stopped before the end of the store with ~${pass.remaining} leads unscanned. Everything sent was recorded, and the remainder is picked up on the next run. If this keeps appearing, the pass needs a bigger budget or fewer leads to walk.</p>`
            : "<p>Full pass — the whole lead store was scanned.</p>"}
          <ul>${results.map((r) => `<li>${r}</li>`).join("")}</ul>
        </div>`,
      });
    } catch (e) {
      console.error("Drip report failed:", e.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ sent, results, ...pass, results: undefined }) };
};
