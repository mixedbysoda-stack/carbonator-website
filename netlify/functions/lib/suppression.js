// Email suppression — unsubscribes and do-not-contact.
// Canonical machine list. Human-readable mirror: /email-suppression.txt (repo root).
// Add an address here (lowercase) when someone unsubscribes; deploy to take effect.

const SUPPRESSED = [
  "frankbugbee10@gmail.com", // unsubscribed 2026-04-28
  "tom@thomann.de", // B2B contact, opted out — restored 2026-08-04 after being lost in the repo path move (was only in the old ~/Desktop/Carbonator/website copy)
  "mangor@web.de", // opted out — restored 2026-08-04, same gap as above
];

function normalize(email) {
  return String(email || "").trim().toLowerCase();
}

function isSuppressed(email) {
  if (!email) return false;
  return SUPPRESSED.includes(normalize(email));
}

// Bounces and complaints arrive by webhook, long after a deploy. They land in
// Blobs so a hard bounce stops the next send without waiting on a code change;
// the list above stays the record for deliberate, human-entered opt-outs.
async function loadDynamicSuppressions() {
  try {
    const { getBlobStore } = require("./store");
    const entry = await getBlobStore("email-suppression").get("dynamic", { type: "json" });
    return new Set((entry && entry.emails) || []);
  } catch (err) {
    console.error("Dynamic suppression read failed (static list still applies):", err.message);
    return new Set();
  }
}

// Prefer this in any bulk send. Falling back to the static list on a Blobs
// outage is deliberate: it can only ever send to fewer people, never more.
async function isSuppressedAsync(email) {
  if (!email) return false;
  if (isSuppressed(email)) return true;
  return (await loadDynamicSuppressions()).has(normalize(email));
}

async function suppress(email, reason) {
  const address = normalize(email);
  if (!address) return false;
  const { getBlobStore } = require("./store");
  const store = getBlobStore("email-suppression");
  const entry = (await store.get("dynamic", { type: "json" }).catch(() => null)) || { emails: [], log: [] };
  if (entry.emails.includes(address)) return false;
  entry.emails.push(address);
  entry.log.push({ email: address, reason: String(reason || "unknown"), at: new Date().toISOString() });
  await store.setJSON("dynamic", entry);
  console.log(`Suppressed ${address} (${reason})`);
  return true;
}

module.exports = { SUPPRESSED, isSuppressed, isSuppressedAsync, suppress, loadDynamicSuppressions };
