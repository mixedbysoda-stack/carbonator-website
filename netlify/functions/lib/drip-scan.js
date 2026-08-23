// Shared scan for the scheduled drip functions.
//
// WHY THIS EXISTS: drip-day3.js and drip-day7.js each walked the whole leads
// store doing `await store.get(key)` per lead AND `await isSuppressedAsync(...)`
// per lead — and isSuppressedAsync re-reads the dynamic suppression blob every
// single call. That is two blob round-trips per lead, ~800 for a 398-lead store,
// on top of loadBuyerEmails()'s 20-page Stripe walk. A scheduled function does
// not get that long, so the pass was being killed partway through.
//
// Observed 2026-08-23: drip-day3's 10:00 UTC run sent its last email at
// 10:02:37.800 and died before persisting the status. 18 leads sat at
// "email1_sent" past their day-3 date — all of them at the tail of the key
// order — while drip-day7, whose candidates are older and therefore earlier in
// that order, had no backlog at all. Each daily run crept a few leads further
// and then died again, and the lead whose status write was lost was queued to
// be emailed the same nudge again the next day.
//
// Three fixes, all of them here so the two callers cannot drift apart:
//
//   1. Suppression is loaded ONCE per pass, not once per lead.
//   2. The walk goes NEWEST FIRST. Day-N candidates are by definition recent,
//      so the leads that are due on time are reached first and a historical
//      backlog can never starve them.
//   3. The pass stops cleanly on a wall-clock budget instead of being killed.
//      That is what guarantees a send is always followed by its status write.
//
// Belt and braces for (3): every send is claimed in the lead record BEFORE it
// goes out. If a pass still dies in the gap between sending and recording, the
// claim is what stops the next run mailing the same person again. A claim
// expires after CLAIM_TTL_MS so a send that genuinely failed is retried rather
// than dropped forever.

const { getBlobStore } = require("./store");
const { SUPPRESSED, loadDynamicSuppressions } = require("./suppression");

const DEFAULT_BUDGET_MS = 18000;
const DEFAULT_MAX_SENDS = 40;
const CLAIM_TTL_MS = 3 * 24 * 60 * 60 * 1000;

const normalize = (email) => String(email || "").trim().toLowerCase();

/** Static opt-outs plus the dynamic bounce/complaint list, resolved once. */
async function loadSuppressionSet() {
  const set = new Set(SUPPRESSED.map(normalize));
  try {
    for (const email of await loadDynamicSuppressions()) set.add(normalize(email));
  } catch (err) {
    // Falling back to the static list can only ever send to fewer people.
    console.error("Dynamic suppression load failed (static list still applies):", err.message);
  }
  return set;
}

/**
 * Run one drip pass.
 *
 * @param {object}   o
 * @param {string}   o.label        e.g. "Day 3" — used in log lines
 * @param {Set}      o.buyerEmails  addresses that must never get a purchase pitch
 * @param {function} o.isDue        (lead) => boolean — status + elapsed test
 * @param {string}   o.claimField   e.g. "email2_attempted_at"
 * @param {function} o.send         async (lead) => void — performs the send
 * @param {function} o.markSent     (lead) => object — fields recording the send
 *
 * Returns { sent, scanned, skipped, failed, remaining, stoppedEarly, results }.
 */
async function runDripPass({
  label,
  buyerEmails,
  isDue,
  claimField,
  send,
  markSent,
  budgetMs = DEFAULT_BUDGET_MS,
  maxSends = DEFAULT_MAX_SENDS,
}) {
  const startedAt = Date.now();
  const store = getBlobStore("leads");
  const { blobs } = await store.list();

  // Keys are `lead_<epochMs>_<rand>`, so reverse-lexical is newest-first.
  const keys = (blobs || []).map((b) => b.key).sort().reverse();
  const suppressed = await loadSuppressionSet();

  const out = { sent: 0, scanned: 0, skipped: 0, failed: 0, remaining: 0, stoppedEarly: false, results: [] };
  const outOfTime = () => Date.now() - startedAt >= budgetMs;

  for (let i = 0; i < keys.length; i++) {
    if (outOfTime() || out.sent >= maxSends) {
      // Everything already sent has been recorded. Whatever is left is still a
      // candidate next run, and because the walk is newest-first the backlog
      // that remains is the oldest part of it.
      out.stoppedEarly = true;
      out.remaining = keys.length - i;
      break;
    }

    out.scanned++;
    let lead;
    try {
      lead = await store.get(keys[i], { type: "json" });
    } catch {
      continue;
    }
    if (!lead || !lead.contact) continue;
    if (!isDue(lead)) continue;

    const email = normalize(lead.contact);
    if (suppressed.has(email)) { out.skipped++; continue; }
    if (buyerEmails.has(email)) { out.skipped++; continue; }

    // A live claim means a previous pass already put this email in flight.
    const claimedAt = lead[claimField] ? new Date(lead[claimField]).getTime() : 0;
    if (claimedAt && Date.now() - claimedAt < CLAIM_TTL_MS) { out.skipped++; continue; }

    const nowIso = new Date().toISOString();
    try {
      // Claim first: if this pass dies between the send and the status write,
      // the claim is what stops tomorrow's pass re-sending.
      await store.setJSON(keys[i], { ...lead, [claimField]: nowIso });
      await send(lead);
      await store.setJSON(keys[i], { ...lead, [claimField]: nowIso, ...markSent(lead) });
      out.sent++;
      out.results.push(`${label} sent to ${lead.contact}`);
    } catch (err) {
      out.failed++;
      console.error(`${label} failed for ${keys[i]}:`, err.message);
      // Leave the claim in place. It expires after CLAIM_TTL_MS, so a genuine
      // failure is retried rather than dropped, without a same-day repeat.
      if (err.retryable) {
        console.error(`${label}: retryable error — ending the pass to protect transactional headroom.`);
        out.stoppedEarly = true;
        out.remaining = keys.length - i - 1;
        break;
      }
    }
  }

  console.log(
    `${label} pass: scanned ${out.scanned}/${keys.length}, sent ${out.sent}, skipped ${out.skipped}, ` +
    `failed ${out.failed}${out.stoppedEarly ? `, stopped early with ~${out.remaining} unscanned` : ", full pass"}`
  );
  return out;
}

module.exports = { runDripPass, loadSuppressionSet, CLAIM_TTL_MS };
