// Self-imposed daily send budget for the one-off welcome backfill.
//
// WHY THIS IS NOT A QUOTA READ: Resend exposes no usage endpoint. /usage is a
// 404 and /account, /quota and /limits reject GET, so there is no way to ask
// the account how much of today's allowance is left. The only thing an API
// caller ever learns is a 429 daily_quota_exceeded on a send that has already
// been refused — and by then a licence-delivery email is what got refused.
//
// That is exactly what happened on 2026-08-23: a 273-recipient marketing blast
// ate the day's allowance and the next purchase produced no licence key.
//
// So the budget here is a ceiling we impose on ourselves, not a balance we
// read. The backfill gets a small fixed number of sends per UTC day (default
// 40, override with BACKFILL_DAILY_MAX) and every send is written to the ledger
// before the next one is attempted. Whatever the account's real cap is, the
// backfill can only ever consume this much of it, and everything else stays
// available for purchases.
//
// Reads fail closed. If the ledger cannot be read we report the day as fully
// spent, because "unknown usage" must never be treated as "plenty left".

const { getBlobStore } = require("./store");

const STORE_NAME = "email-quota";
const DEFAULT_BACKFILL_DAILY_MAX = 40;

function utcDay(now) {
  return (now || new Date()).toISOString().slice(0, 10);
}

function ledgerKey(day) {
  return `backfill_${day}`;
}

function backfillDailyMax() {
  const configured = Number(process.env.BACKFILL_DAILY_MAX);
  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : DEFAULT_BACKFILL_DAILY_MAX;
}

/**
 * Today's backfill budget.
 *
 * Returns { day, max, used, remaining, degraded }. `degraded` means the ledger
 * could not be read and `remaining` was forced to 0 rather than guessed.
 */
async function readBackfillBudget() {
  const day = utcDay();
  const max = backfillDailyMax();

  let record;
  try {
    record = await getBlobStore(STORE_NAME).get(ledgerKey(day), { type: "json" });
  } catch (err) {
    console.error("Backfill budget read failed — treating today as fully spent:", err.message);
    return { day, max, used: max, remaining: 0, degraded: true };
  }

  const used = Number(record && record.count) || 0;
  return { day, max, used, remaining: Math.max(0, max - used), degraded: false };
}

/**
 * Record one accepted send. Called after each individual send rather than once
 * per batch, so a function timeout mid-run cannot lose the count and hand the
 * next run a budget it has already spent.
 *
 * Throws on write failure — the caller must stop rather than keep sending
 * against a ledger that is no longer advancing.
 */
async function recordBackfillSend() {
  const day = utcDay();
  const store = getBlobStore(STORE_NAME);
  const key = ledgerKey(day);
  const record = (await store.get(key, { type: "json" }).catch(() => null)) || { count: 0 };
  const next = { count: (Number(record.count) || 0) + 1, updated_at: new Date().toISOString() };
  await store.setJSON(key, next);
  return next.count;
}

module.exports = { readBackfillBudget, recordBackfillSend, backfillDailyMax, utcDay };
