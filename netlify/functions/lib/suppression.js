// Email suppression — unsubscribes and do-not-contact.
// Canonical machine list. Human-readable mirror: /email-suppression.txt (repo root).
// Add an address here (lowercase) when someone unsubscribes; deploy to take effect.

const SUPPRESSED = [
  "frankbugbee10@gmail.com", // unsubscribed 2026-04-28
  "tom@thomann.de", // B2B contact, opted out — restored 2026-08-04 after being lost in the repo path move (was only in the old ~/Desktop/Carbonator/website copy)
  "mangor@web.de", // opted out — restored 2026-08-04, same gap as above
];

function isSuppressed(email) {
  if (!email) return false;
  return SUPPRESSED.includes(String(email).trim().toLowerCase());
}

module.exports = { SUPPRESSED, isSuppressed };
