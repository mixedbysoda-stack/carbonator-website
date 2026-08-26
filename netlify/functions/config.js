// Shared configuration — update version and URLs in one place
const crypto = require("crypto");

const VERSION = "2.2.0";

const DOWNLOAD_URLS = {
  mac: `https://github.com/mixedbysoda-stack/carbonator/releases/download/v${VERSION}/Carbonator-v${VERSION}-Installer.pkg`,
  windows: `https://github.com/mixedbysoda-stack/carbonator/releases/download/v${VERSION}/Carbonator-Windows-Installer.zip`,
};

// Multi-product registry
const PRODUCTS = {
  carbonator: {
    name: "Carbonator",
    version: "2.2.0",
    price: 20,
    downloads: {
      mac: `https://github.com/mixedbysoda-stack/carbonator/releases/download/v2.2.0/Carbonator-v2.2.0-Installer.pkg`,
      windows: `https://github.com/mixedbysoda-stack/carbonator/releases/download/v2.2.0/Carbonator-Windows-Installer.zip`,
    },
    secretEnv: "CARBONATOR_LICENSE_SECRET",
  },
  desipper: {
    name: "De-Sipper",
    version: "1.0.0",
    price: 20,
    downloads: {
      mac: `https://github.com/mixedbysoda-stack/desipper/releases/download/v1.0.0/De-Sipper-v1.0-Installer.pkg`,
      windows: `https://github.com/mixedbysoda-stack/desipper/releases/download/v1.0.0/De-Sipper-v1.0.0-Windows-Installer.exe`,
    },
    secretEnv: "DESIPPER_LICENSE_SECRET",
  },
  ontap: {
    name: "On Tap",
    version: "1.0.0",
    price: 20,
    downloads: {
      mac: `https://github.com/mixedbysoda-stack/ontap/releases/download/v1.0.0/OnTap-v1.0.0-Installer.pkg`,
      windows: `https://github.com/mixedbysoda-stack/ontap/releases/download/v1.0.0/OnTap-v1.0.0-Windows-Installer.exe`,
    },
    secretEnv: "ONTAP_LICENSE_SECRET",
  },
  pour: {
    name: "Pour",
    version: "1.0.0",
    price: 20,
    downloads: {
      mac: `https://github.com/mixedbysoda-stack/pour/releases/download/v1.0.0/Pour-v1.0.0-Installer.pkg`,
      windows: `https://github.com/mixedbysoda-stack/pour/releases/download/v1.0.0/Pour-v1.0.0-Windows-Installer.exe`,
    },
    secretEnv: "POUR_LICENSE_SECRET",
  },
  tonic: {
    name: "Tonic",
    version: "2.0.0",
    price: 20,
    downloads: {
      mac: `https://github.com/mixedbysoda-stack/tonic/releases/download/v2.0.0/Tonic-v2.0.0-Installer.pkg`,
      // Windows v2 not yet shipped — pointer kept for the future v1 EXE that
      // never released either; CI build will populate this slot when ready.
      windows: `https://github.com/mixedbysoda-stack/tonic/releases/download/v2.0.0/Tonic-v2.0.0-Windows-Installer.exe`,
    },
    secretEnv: "TONIC_LICENSE_SECRET",
  },
  octane: {
    name: "FIZZFUEL",
    version: "1.0.0",
    price: 29,
    downloads: {
      // Release assets on mixedbysoda-stack/octane (public repo)
      mac: `https://github.com/mixedbysoda-stack/octane/releases/download/v1.0.0/FIZZFUEL-v1.0.0-Installer.pkg`,
      // Windows = Inno Setup installer (installs VST3 to Common Files\VST3). Smoke-test on real Windows before heavy PC promotion.
      windows: `https://github.com/mixedbysoda-stack/octane/releases/download/v1.0.0/FIZZFUEL-v1.0.0-Windows-Installer.exe`,
    },
    secretEnv: "OCTANE_LICENSE_SECRET",
  },
  tallboy: {
    name: "TALLBOY",
    version: "1.0.0",
    price: 20,
    downloads: {
      // `latest` alias so a new tag ships to every buyer without editing this
      // file — the asset names are intentionally unversioned.
      mac: `https://github.com/mixedbysoda-stack/TALLBOY/releases/latest/download/TALLBOY-Installer.pkg`,
      windows: `https://github.com/mixedbysoda-stack/TALLBOY/releases/latest/download/TALLBOY-Windows-Installer.exe`,
    },
    // What is actually inside each installer. The success page renders these
    // verbatim, so they must match the shipped packages — the macOS pkg carries
    // VST3/AU/AAX and the Windows exe carries VST3 only.
    formats: { mac: "VST3, AU, AAX", windows: "VST3" },
    secretEnv: "TALLBOY_LICENSE_SECRET",
  },
  still: {
    name: "Still",
    // Display only. The installer itself is resolved via the `latest` release
    // alias below, so this string can never send anyone an outdated build.
    version: "1.0.1",
    price: 0, // FREE — email-gated lead magnet, no Stripe, no licensing
    downloads: {
      // Resolved through the `latest` release alias so a new tag ships to every
      // visitor without editing this file. The asset name is intentionally
      // unversioned — that is what makes the alias resolvable.
      mac: `https://github.com/mixedbysoda-stack/still/releases/latest/download/Still-Installer.pkg`,
      // Windows CI build pending — slot populated when it ships
      windows: null,
    },
  },
  bundle: {
    name: "Carbonated Audio Complete Bundle",
    price: 60,
    isBundle: true,
    // Tonic temporarily removed from the bundle pending a trademark name change.
    // Its product definition + activation function are kept below so existing
    // owners' licenses still validate. Re-add to includes once the rename ships.
    // This id is what the live $60 payment link (buy.stripe.com/aFa4gz...)
    // carries in its metadata, and that link is embedded in emails already
    // sent — so it keeps delivering exactly these four.
    includes: ["carbonator", "desipper", "ontap", "pour"],
  },
  bundle5: {
    // RETIRED 2026-08-23, the same day it launched. Five plugins at $50 was
    // strictly worse value than the seven-plugin bundle at $55, so its payment
    // link (plink_1U7UXxE7QUGObiuvojyBIofP) is deactivated in Stripe and the
    // email templates now point at september_bundle. Kept here so the handful
    // of keys already issued under product=bundle5 still resolve and validate.
    name: "Carbonated Audio Complete Bundle",
    price: 50,
    isBundle: true,
    includes: ["carbonator", "desipper", "ontap", "pour", "tallboy"],
  },
  september_bundle: {
    // The one all-in bundle. TALLBOY joined it on 2026-08-23 and the price went
    // $45 -> $55, at which point bundle5 (5 plugins, $50) became strictly worse
    // value and was retired — its payment link is deactivated in Stripe and the
    // email templates now point here. bundle5 stays defined below so existing
    // buyers' keys still validate.
    //
    // Stripe: its own flat $55 price on a new link (plink_1U7npA...,
    // buy.stripe.com/dRmbJ1...), so checkout shows $55 outright instead of a
    // promo-discounted $109 that would contradict the page's value math.
    // The previous $109 link with ALL6FOR45 (-$64) stays live until
    // 2026-09-30 so bundle links in drip mail already sent keep working.
    name: "Carbonated Audio All 7 Plugins Bundle",
    price: 55,
    isBundle: true,
    // Public lineup: the four original paid effects, FIZZFUEL, TALLBOY, Still.
    includes: ["carbonator", "desipper", "ontap", "pour", "octane", "tallboy", "still"],
  },
  vocal_bundle: {
    name: "Vocal Chain Bundle",
    price: 35,
    isBundle: true,
    includes: ["carbonator", "desipper"],
  },
  mixbus_bundle: {
    name: "Mix Bus Bundle",
    price: 30,
    isBundle: true,
    includes: ["ontap", "pour"],
  },
  apd_bundle: {
    // Ran 2026-06-29 to 2026-07-12. Coupon APD_BUNDLE_2026 expired 2026-07-31.
    // Kept so keys issued under this id still validate.
    name: "APD Exclusive 3-in-1 Bundle",
    price: 55,
    isBundle: true,
    includes: ["carbonator", "desipper", "ontap"],
  },
  // Audio Plugin Deals, 2026-08-31 to 2026-09-13. Two SKUs because the lineup
  // was still open when the codes were minted: APD publishes whichever link
  // they confirm, and one shared 100%-off coupon covers both products.
  // `price` here is the honest sum of the live individual prices, which is the
  // anchor APD publishes -- not a number we invented. Verify against the
  // individual `price` fields above before changing either.
  apd_bundle_4: {
    name: "APD Exclusive 4-in-1 Bundle",
    price: 89, // 20 + 20 + 20 + 29
    isBundle: true,
    includes: ["carbonator", "desipper", "ontap", "octane"],
  },
  apd_bundle_5: {
    name: "APD Exclusive 5-in-1 Bundle",
    price: 109, // 20 + 20 + 20 + 29 + 20
    isBundle: true,
    includes: ["carbonator", "desipper", "ontap", "octane", "tallboy"],
  },
};

/**
 * Generate a deterministic activation key from email + Stripe session timestamp.
 * Key = 32 bytes (64 hex chars): 16-byte email hash + 8-byte timestamp + 8-byte HMAC
 * Formatted as: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
 */
function generateActivationKey(email, sessionCreated, secret) {
  const emailHash = crypto
    .createHash("sha256")
    .update((email || "").toLowerCase().trim())
    .digest()
    .slice(0, 16);

  const timestamp = Buffer.alloc(8);
  timestamp.writeBigUInt64BE(BigInt(sessionCreated));

  const payload = Buffer.concat([emailHash, timestamp]);
  const hmac = crypto
    .createHmac("sha256", Buffer.from(secret, "hex"))
    .update(payload)
    .digest()
    .slice(0, 8);

  const raw = Buffer.concat([emailHash, timestamp, hmac])
    .toString("hex")
    .toUpperCase();
  return raw.match(/.{8}/g).join("-");
}

/**
 * Validate a key's HMAC signature (strips dashes, lowercases).
 * Returns true if the key was generated with the given secret.
 */
function validateActivationKey(keyHex, secret) {
  const clean = keyHex.replace(/-/g, "").toLowerCase();
  if (clean.length !== 64) return false;

  const buf = Buffer.from(clean, "hex");
  if (buf.length !== 32) return false;

  const emailHash = buf.slice(0, 16);
  const timestamp = buf.slice(16, 24);
  const providedHmac = buf.slice(24, 32);

  const payload = Buffer.concat([emailHash, timestamp]);
  const expectedHmac = crypto
    .createHmac("sha256", Buffer.from(secret, "hex"))
    .update(payload)
    .digest()
    .slice(0, 8);

  return crypto.timingSafeEqual(providedHmac, expectedHmac);
}

module.exports = {
  VERSION,
  DOWNLOAD_URLS,
  PRODUCTS,
  generateActivationKey,
  validateActivationKey,
};
