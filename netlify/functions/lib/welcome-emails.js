// Welcome ("email 1") templates — the single source of truth.
//
// These four builders lived inside capture-lead.js, private to it. They are
// shared now because a lead can end up needing email 1 sent from somewhere
// other than the capture request that created it: backfill-welcome.js re-sends
// email 1 to leads whose send failed at capture time and left them parked at
// drip_status "email1_pending", outside the drip entirely.
//
// The HTML is unchanged from capture-lead.js. Only buildStillWelcomeEmail has a
// new signature — it takes the resolved confirm URL rather than the request
// event, because the backfill has no request to derive an origin from.

const { PRODUCTS } = require("../config");
const { buildEmail } = require("../../../email-templates/render.js");

function buildStillWelcomeEmail(confirmUrl) {
  const url = confirmUrl;
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

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr><td align="center">
              <a href="https://carbonatedaudio.com/Carbonator%20DEMO.zip" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#ff6b2b,#ff8c42);color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">
                Download Carbonator Demo (macOS)
              </a>
            </td></tr>
          </table>
          <p style="color:#a09bb5;font-size:14px;text-align:center;margin:0 0 32px;">On Windows? <a href="https://github.com/mixedbysoda-stack/carbonator/releases/download/v2.2.0-demo/Carbonator-v2.2.0-Demo-Windows-Installer.exe" style="color:#ff8c42;text-decoration:none;font-weight:600;">Download the Windows demo installer</a> (VST3).</p>

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
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">macOS:</strong> Unzip, then copy the VST3, AU, AAX or Standalone bundle into the matching folder under <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;">/Library/Audio/Plug-Ins/</code>.</li>
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Windows:</strong> Run the demo installer. VST3 lands in <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;">C:\\Program Files\\Common Files\\VST3\\</code></li>
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

// De-Sipper demo assets. Verified live 2026-09-10 (302 -> 4.9 MB pkg, 5.0 MB exe).
// desipper.html hands out the same two files from its gate.
const DESIPPER_DEMO = {
  mac: "https://github.com/mixedbysoda-stack/desipper/releases/download/v1.0.0-demo/DeSipper-Demo-v1.0.0-macOS.pkg",
  windows: "https://github.com/mixedbysoda-stack/desipper/releases/download/v1.0.0-demo/De-Sipper-v1.0.0-Demo-Windows-Installer.exe",
};

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

          <h1 style="color:#ffffff;font-size:24px;text-align:center;margin:0 0 8px;">Your De-Sipper Demo is ready</h1>
          <p style="color:#a09bb5;font-size:16px;text-align:center;margin:0 0 32px;">Every feature unlocked. The demo plays 60 seconds, mutes for 10, and repeats - enough to run it on a real vocal before you decide.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr><td align="center">
              <a href="${DESIPPER_DEMO.mac}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00d4ff,#0ea5e9);color:#07201c;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;">
                Download for macOS
              </a>
            </td></tr>
          </table>
          <p style="color:#a09bb5;font-size:14px;text-align:center;margin:0 0 32px;">On Windows? <a href="${DESIPPER_DEMO.windows}" style="color:#00d4ff;text-decoration:none;font-weight:600;">Download the Windows demo installer</a> (VST3).</p>

          <hr style="border:none;border-top:1px solid #2a2440;margin:0 0 24px;">

          <h2 style="color:#ffffff;font-size:18px;margin:0 0 16px;">What De-Sipper does:</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#a09bb5;">
            <tr><td style="padding:6px 0;"><strong style="color:#00d4ff;">Transparent De-Essing</strong> - tames harsh sibilance without dulling the vocal.</td></tr>
            <tr><td style="padding:6px 0;"><strong style="color:#00d4ff;">Split-Band Processing</strong> - only the sibilant band is touched. Everything else passes through clean.</td></tr>
            <tr><td style="padding:6px 0;"><strong style="color:#00d4ff;">Listen Mode</strong> - solo exactly what is being removed so you can dial it in.</td></tr>
            <tr><td style="padding:6px 0;"><strong style="color:#00d4ff;">Zero Latency</strong> - no lookahead delay. Works while tracking and while mixing.</td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">

          <h2 style="color:#ffffff;font-size:16px;margin:0 0 12px;">Quick Start</h2>
          <ol style="color:#a09bb5;font-size:14px;padding-left:20px;margin:0;">
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">macOS:</strong> open the .pkg and pick VST3, AU or AAX.</li>
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Windows:</strong> run the installer. VST3 lands in the Common Files folder.</li>
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Rescan plugins</strong> in your DAW, drop De-Sipper after your vocal compressor, pull the threshold down until the esses sit.</li>
          </ol>

          <p style="color:#a09bb5;font-size:14px;margin:24px 0 0;text-align:center;">
            When the mute cycle gets in the way: <a href="https://carbonatedaudio.com/desipper?utm_source=demo_email&utm_medium=email&utm_campaign=desipper_welcome" style="color:#00d4ff;text-decoration:none;font-weight:600;">De-Sipper is $20</a>, one license, no subscription.
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

// Human-readable product names, for owner-facing notification subjects.
const PRODUCT_LABELS = {
  carbonator: "Carbonator",
  desipper: "De-Sipper",
  ontap: "On Tap",
  pour: "Pour",
  fizzfuel: "FIZZFUEL",
  tallboy: "TALLBOY",
  still: "Still",
};

// Source string -> product key. Mirrors capture-lead.js, which tests the same
// substrings in this order, plus the products that only ever reach this module
// through the backfill.
function productFromSource(source) {
  const s = String(source || "").toLowerCase();
  if (s.includes("still")) return "still";
  if (s.includes("ontap")) return "ontap";
  if (s.includes("desipper")) return "desipper";
  if (s.includes("tallboy")) return "tallboy";
  if (s.includes("fizzfuel") || s.includes("octane")) return "fizzfuel";
  if (s.includes("pour")) return "pour";
  return "carbonator";
}

// Carbonator, De-Sipper, On Tap and Still have hand-written welcome emails.
// Pour, FIZZFUEL and TALLBOY never got one: capture-lead.js falls through to
// the Carbonator template for them, so a Pour lead is welcomed to Carbonator.
// Rather than repeat that here, these three render from the shared spotlight
// template with their own copy and their own installer link.
// The demo build ships under its own tag; tallboy.html links the same files.
const TALLBOY_DEMO = {
  mac: "https://github.com/mixedbysoda-stack/TALLBOY/releases/download/v1.0.0-demo/TALLBOY-Demo-Installer.pkg",
  windows: "https://github.com/mixedbysoda-stack/TALLBOY/releases/download/v1.0.0-demo/TALLBOY-Demo-Windows-Installer.exe",
};

// Pour demo assets. pour.html hands out the same two files from its gate; the
// paid installer in PRODUCTS.pour.downloads is locked without a key and must
// never be sent to a lead. Verified live 2026-09-10 (7.4 MB pkg, 4.9 MB exe).
const POUR_DEMO = {
  mac: "https://github.com/mixedbysoda-stack/pour/releases/download/v1.0.0-demo/Pour-v1.0.0-Demo-Installer.pkg",
  windows: "https://github.com/mixedbysoda-stack/pour/releases/download/v1.0.0-demo/Pour-v1.0.0-Demo-Windows-Installer.exe",
};

const SPOTLIGHT_WELCOME = {
  pour: {
    productKey: "pour",
    subject: "Your Pour Demo is ready 🌊",
    headline: "Your Pour Demo is ready",
    intro: "Stereo imaging with Blumlein bass shuffling, full M/S shaping, and a live vectorscope so you can see what you are doing. The button below is the macOS demo (VST3, AU, AAX); on Windows grab the VST3 demo here: <a href=\"" + POUR_DEMO.windows + "\" style=\"color:#6fc7bc;\">Pour-v1.0.0-Demo-Windows-Installer.exe</a>. The demo plays 60 seconds of audio, then mutes for 10, on a loop.",
    features: [
      "<strong style=\"color:#ffffff;\">Shuffle + Space</strong> — Blumlein bass stereo shuffling for wider lows",
      "<strong style=\"color:#ffffff;\">Width, Rotation, Asymmetry</strong> — full M/S shaping control",
      "<strong style=\"color:#ffffff;\">Live vectorscope</strong> — see the stereo field in real time",
    ],
    ctaText: "Download Pour Demo (macOS)",
    ctaUrl: POUR_DEMO.mac,
  },
  fizzfuel: {
    // The FIZZFUEL demo build does not exist yet and the full installer is
    // locked without a license key, so this is a waitlist email on purpose.
    // Do NOT link an installer here until the demo ships; when it does, point
    // ctaUrl at the demo asset and restore "Your FIZZFUEL Demo is ready" copy.
    productKey: "fizzfuel",
    subject: "You're on the FIZZFUEL demo list",
    headline: "You're on the FIZZFUEL demo list",
    intro: "The free FIZZFUEL demo isn't out yet - you're on the list, and it will land in your inbox the moment it ships. Until then, the sound demos on the product page show exactly what the gearbox does.",
    features: [
      "<strong style=\"color:#ffffff;\">6 gears</strong> - Drive, Reverb, Delay, Pitch, Filter + clean A/B",
      "<strong style=\"color:#ffffff;\">20+ styles</strong> - tape warmth through shimmer and self-oscillating echoes",
      "<strong style=\"color:#ffffff;\">The shifter</strong> - throw the stick, glitch-free crossfades between effects",
    ],
    ctaText: "Hear FIZZFUEL in action",
    ctaUrl: "https://carbonatedaudio.com/fizzfuel?utm_source=demo_waitlist&utm_medium=email&utm_campaign=fizzfuel_waitlist#sound",
  },
  tallboy: {
    productKey: "tallboy",
    subject: "Your TALLBOY Demo is ready 🎮",
    headline: "Your TALLBOY Demo is ready",
    intro: "TALLBOY tracks the pitch of whatever you feed it — a vocal, a bass line, a hummed hook — and replays that performance through a four-channel handheld-console sound chip. Feed it a single note at a time so it has something to lock onto. The button below is the macOS demo (VST3 + AU); on Windows grab the VST3 demo here: <a href=\"" + TALLBOY_DEMO.windows + "\" style=\"color:#c2d24f;\">TALLBOY-Demo-Windows-Installer.exe</a>. The demo plays 60 seconds of audio, then mutes for 10, on a loop.",
    features: [
      "<strong style=\"color:#ffffff;\">CHIP 4CH RESYNTH</strong> — pitch-tracked resynthesis on four modelled channels",
      "<strong style=\"color:#ffffff;\">ARP + GLIDE</strong> — host-synced, five modes, up to four octaves",
      "<strong style=\"color:#ffffff;\">CRUSH ROM</strong> — 1-16 bit, rate divide with jitter, post filter",
    ],
    ctaText: "Download TALLBOY Demo",
    // Until 2026-09 this pointed at PRODUCTS.tallboy.downloads.mac, which is the
    // PAID installer (needs a licence key). A "demo" email has to hand out the
    // demo build, which lives under its own release tag.
    ctaUrl: TALLBOY_DEMO.mac,
  },
};

function buildSpotlightWelcome(spec) {
  return buildEmail("spotlight", {
    product: spec.productKey,
    headline: spec.headline,
    body: `<p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 16px;">${spec.intro}</p>`,
    features: spec.features,
    ctaText: spec.ctaText,
    ctaUrl: spec.ctaUrl,
    signatureName: "Soda",
    preheader: spec.headline,
  });
}

/**
 * Resolve the welcome email for a lead source.
 *
 * Still is the one product whose welcome email is not self-contained: its
 * button both confirms the inbox and downloads, so it needs a freshly minted
 * grant. Callers pass `stillConfirmUrl`; without one, "still" is refused
 * rather than silently welcomed to something else.
 *
 * Returns { product, subject, html } or throws.
 */
function buildWelcome({ source, stillConfirmUrl }) {
  const product = productFromSource(source);

  if (product === "still") {
    if (!stillConfirmUrl) {
      throw new Error("Still welcome email requires a stillConfirmUrl (download grant)");
    }
    return {
      product,
      subject: "Still is yours — free noise suppressor 💧",
      html: buildStillWelcomeEmail(stillConfirmUrl),
    };
  }

  if (product === "ontap") {
    return { product, subject: "Your On Tap Demo is ready 🎚️", html: buildOnTapWelcomeEmail() };
  }
  if (product === "desipper") {
    return { product, subject: "Your De-Sipper Demo is ready", html: buildDesipperWelcomeEmail() };
  }

  const spotlight = SPOTLIGHT_WELCOME[product];
  if (spotlight) {
    return { product, subject: spotlight.subject, html: buildSpotlightWelcome(spotlight) };
  }

  return { product: "carbonator", subject: "Your Carbonator Demo is ready 🎛️", html: buildWelcomeEmail() };
}

module.exports = {
  buildWelcome,
  productFromSource,
  PRODUCT_LABELS,
  buildStillWelcomeEmail,
  buildWelcomeEmail,
  buildDesipperWelcomeEmail,
  buildOnTapWelcomeEmail,
};
