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
//   2. The walk starts NEWEST FIRST, so leads that are due on time are served
//      before any historical backlog.
//   3. The pass stops cleanly on a wall-clock budget instead of being killed.
//      That is what guarantees a send is always followed by its status write.
//
// UPDATE 2026-08-27 — newest-first alone was not enough. A blob read costs
// ~85-100ms from inside the function (measured against the live store), so a
// 469-lead store needs ~40s just to *look* at every lead, well past what a
// scheduled function gets. Every run was reporting "stopped early", and because
// the walk always restarted from the newest key, anything past the budget
// horizon was never reached at all: day-3 leads aged 9 and 23 days sat there
// while the pass re-scanned the same recent leads every day and sent nothing.
//
// So the walk is now in two parts. A bounded HEAD of the newest keys keeps
// on-time delivery intact, then the rest of the budget continues from a cursor
// persisted between runs, wrapping at the end. Fresh leads are still served the
// day they come due, and every older lead is guaranteed to be visited within a
// few runs no matter how large the store grows.
//
// Belt and braces for (3): every send is claimed in the lead record BEFORE it
// goes out. If a pass still dies in the gap between sending and recording, the
// claim is what stops the next run mailing the same person again. A claim
// expires after CLAIM_TTL_MS so a send that genuinely failed is retried rather
// than dropped forever.

const { getBlobStore } = require("./store");
const { SUPPRESSED, loadDynamicSuppressions } = require("./suppression");

const DEFAULT_BUDGET_MS = 20000;
const DEFAULT_MAX_SENDS = 40;
const CLAIM_TTL_MS = 3 * 24 * 60 * 60 * 1000;

// How many of the newest keys to always check first, before spending what is
// left of the budget on the rotating sweep. Sized so on-time delivery is never
// at the mercy of where the cursor happens to be.
const HEAD_SCAN = 60;

// Where each pass leaves off, so the next one carries on instead of restarting.
const CURSOR_STORE = "drip-cursors";

async function readCursor(label) {
  try {
    const rec = await getBlobStore(CURSOR_STORE).get(label, { type: "json" });
    return (rec && rec.key) || null;
  } catch (err) {
    console.error(`Cursor read failed for ${label} (starting from the top):`, err.message);
    return null;
  }
}

async function writeCursor(label, key) {
  try {
    await getBlobStore(CURSOR_STORE).setJSON(label, { key, at: new Date().toISOString() });
  } catch (err) {
    // Losing the cursor only costs coverage speed, never correctness.
    console.error(`Cursor write failed for ${label}:`, err.message);
  }
}

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
  buyerEmails,          // may be a function: resolved lazily, only if work exists
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

  const out = {
    sent: 0, scanned: 0, skipped: 0, failed: 0, remaining: 0,
    stoppedEarly: false, wrapped: false, results: [],
  };
  const outOfTime = () => Date.now() - startedAt >= budgetMs;

  // Buyers cost a 20-page Stripe walk. A pass that finds nothing due should not
  // pay for it, so it is resolved on first need and then reused.
  let buyers = typeof buyerEmails === "function" ? null : buyerEmails;
  const getBuyers = async () => {
    if (buyers === null) buyers = await buyerEmails();
    return buyers;
  };

  // Visit order: the newest HEAD_SCAN keys, then onwards from where the last
  // pass stopped. Deduplicated so a cursor sitting inside the head does not
  // make us read the same lead twice in one pass.
  const cursor = await readCursor(label);
  const resumeAt = cursor ? keys.findIndex((k) => k === cursor) + 1 : 0;
  const head = keys.slice(0, HEAD_SCAN);
  const tail = keys.slice(resumeAt > 0 && resumeAt < keys.length ? resumeAt : HEAD_SCAN);
  const seen = new Set();
  const order = [];
  for (const k of [...head, ...tail]) {
    if (!seen.has(k)) { seen.add(k); order.push(k); }
  }

  let lastVisited = null;

  for (const key of order) {
    if (outOfTime() || out.sent >= maxSends) {
      out.stoppedEarly = true;
      out.remaining = order.length - out.scanned;
      break;
    }

    out.scanned++;
    lastVisited = key;

    let lead;
    try {
      lead = await store.get(key, { type: "json" });
    } catch {
      continue;
    }
    if (!lead || !lead.contact) continue;
    if (!isDue(lead)) continue;

    const email = normalize(lead.contact);
    if (suppressed.has(email)) { out.skipped++; continue; }
    if ((await getBuyers()).has(email)) { out.skipped++; continue; }

    // A live claim means a previous pass already put this email in flight.
    const claimedAt = lead[claimField] ? new Date(lead[claimField]).getTime() : 0;
    if (claimedAt && Date.now() - claimedAt < CLAIM_TTL_MS) { out.skipped++; continue; }

    const nowIso = new Date().toISOString();
    try {
      // Claim first: if this pass dies between the send and the status write,
      // the claim is what stops tomorrow's pass re-sending.
      await store.setJSON(key, { ...lead, [claimField]: nowIso });
      await send(lead);
      await store.setJSON(key, { ...lead, [claimField]: nowIso, ...markSent(lead) });
      out.sent++;
      out.results.push(`${label} sent to ${lead.contact}`);
    } catch (err) {
      out.failed++;
      console.error(`${label} failed for ${key}:`, err.message);
      // Leave the claim in place. It expires after CLAIM_TTL_MS, so a genuine
      // failure is retried rather than dropped, without a same-day repeat.
      if (err.retryable) {
        console.error(`${label}: retryable error — ending the pass to protect transactional headroom.`);
        out.stoppedEarly = true;
        out.remaining = order.length - out.scanned;
        break;
      }
    }
  }

  // Park the cursor where this pass actually got to. A completed sweep resets
  // it so the next run starts from the top again.
  if (out.stoppedEarly && lastVisited) {
    await writeCursor(label, lastVisited);
  } else {
    out.wrapped = true;
    await writeCursor(label, null);
  }

  console.log(
    `${label} pass: scanned ${out.scanned}/${keys.length} (head ${head.length} + resume @${resumeAt}), ` +
    `sent ${out.sent}, skipped ${out.skipped}, failed ${out.failed}` +
    (out.stoppedEarly
      ? `, stopped early — cursor parked at ${lastVisited}, ~${out.remaining} left this lap`
      : ", full sweep, cursor reset")
  );
  return out;
}

module.exports = { runDripPass, loadSuppressionSet, CLAIM_TTL_MS };
