// Shared configuration — update version and URLs in one place
const crypto = require("crypto");

const VERSION = "2.2.0";

const DOWNLOAD_URLS = {
  mac: `https://github.com/mixedbysoda-stack/carbonator/releases/download/v${VERSION}/Carbonator-v${VERSION}-Installer.pkg`,
  windows: `https://github.com/mixedbysoda-stack/carbonator/releases/download/v${VERSION}/Carbonator-Windows-Installer.zip`,
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
  generateActivationKey,
  validateActivationKey,
};
