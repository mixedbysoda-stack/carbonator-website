// Email suppression — unsubscribes and do-not-contact.
// Canonical machine list. Human-readable mirror: /email-suppression.txt (repo root).
// Add an address here (lowercase) when someone unsubscribes; deploy to take effect.

const SUPPRESSED = [
  "frankbugbee10@gmail.com", // unsubscribed 2026-04-28
];

function isSuppressed(email) {
  if (!email) return false;
  return SUPPRESSED.includes(String(email).trim().toLowerCase());
}

module.exports = { SUPPRESSED, isSuppressed };
