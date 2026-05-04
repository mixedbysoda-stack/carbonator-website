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
  bundle: {
    name: "Carbonated Audio Complete Bundle",
    price: 75,
    isBundle: true,
    includes: ["carbonator", "desipper", "ontap", "pour", "tonic"],
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
