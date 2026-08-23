#!/usr/bin/env node
// backfill-welcome-pending.js - run this ON YOUR MAC from the repo folder.
//
// Walks the `leads` blob store through the deployed backfill-welcome function,
// finds every lead parked at drip_status "email1_pending", re-sends the correct
// product welcome email, and advances the status to "email1_sent" only after
// Resend confirms the send.
//
// Usage:
//   node backfill-welcome-pending.js --dry-run
//   node backfill-welcome-pending.js --send
//   node backfill-welcome-pending.js --send --batch 10 --max 25
//
// Prereqs (one time):
//   1. CAMPAIGN_SEND_SECRET set in Netlify env vars (site: carbinated-audio)
//   2. Same value saved in .campaign-secret in this folder (gitignored)
//
// WHY THESE LEADS ARE STUCK: capture-lead.js writes a lead as "email1_pending",
// sends the welcome email, and only then flips it to "email1_sent". Until
// 2026-08-23 the Resend SDK's { data, error } result was never inspected, so a
// refused send read as a success - but the status write sits after the send in
// the same try block, so a send that genuinely failed left the lead pending.
// drip-day3.js only picks up "email1_sent", so a pending lead is shut out of
// the whole nurture sequence. Commit b3cd307 fixed the send layer; this
// repairs the leads stranded before that.
//
// RESUME SAFETY: nothing is tracked in a local file, because nothing needs to
// be - a successful send moves the lead out of "email1_pending", so it is not a
// candidate on the next pass. Kill this mid-run and re-run it; it picks up
// exactly where it stopped. `cursor` pages the scan so each function call stays
// well inside the Netlify timeout.
//
// QUOTA SAFETY: Resend publishes no usage endpoint (/usage 404s; /account,
// /quota and /limits reject GET), so remaining allowance cannot be read. The
// endpoint therefore enforces a small self-imposed ceiling per UTC day
// (BACKFILL_DAILY_MAX, default 40), recorded per send, and aborts the entire
// run on any 429 or 5xx. Licence-key delivery keeps the rest of the account's
// headroom no matter what this script does. This script additionally refuses to
// send more than --max in one invocation.
//
// No email addresses are hardcoded. Suppression comes from
// netlify/functions/lib/suppression.js plus the dynamic bounce list, both
// re-checked server-side on every recipient; buyers are excluded via Stripe.

const fs = require("fs");
const path = require("path");

const ENDPOINT = "https://carbonatedaudio.com/.netlify/functions/backfill-welcome";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  const v = Number(args[i + 1]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};
const DRY = args.includes("--dry-run") || !args.includes("--send");
const BATCH = Math.min(getArg("--batch", 10), 25);
const MAX_SENDS = getArg("--max", 40);

const secretPath = path.join(__dirname, ".campaign-secret");
if (!fs.existsSync(secretPath)) {
  console.error("Missing .campaign-secret in this folder. Create it with the same value as the CAMPAIGN_SEND_SECRET Netlify env var.");
  process.exit(1);
}
const SECRET = fs.readFileSync(secretPath, "utf8").trim();

// Same held addresses the TALLBOY blast holds. mangow@web.de is one character
// from the suppressed mangor@web.de on the same domain; until you confirm they
// are two different people, mailing it risks mailing someone who opted out.
const HOLD = ["mangow@web.de", "mixedbysoda@gmail.com"];

async function call(payload) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-campaign-secret": SECRET },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    throw new Error(`[${res.status}] Non-JSON response: ${text.slice(0, 300)}`);
  }
  if (res.status !== 200) throw new Error(`[${res.status}] ${JSON.stringify(out).slice(0, 400)}`);
  return out;
}

(async () => {
  console.log(`Mode: ${DRY ? "DRY RUN (nothing sends)" : "LIVE SEND"}`);
  console.log(`Batch size: ${BATCH}${DRY ? "" : `, cap for this run: ${MAX_SENDS}`}\n`);

  const totals = {
    scanned: 0, candidates: 0, sent: 0, wouldSend: 0,
    suppressed: 0, buyers: 0, held: 0, needsVerification: 0, failed: 0,
  };
  const failures = [];
  const byProduct = {};

  let cursor = null;
  let pass = 0;

  while (true) {
    pass++;
    const out = await call({
      dryRun: DRY,
      limit: BATCH,
      startAfter: cursor,
      hold: HOLD,
    });

    totals.scanned += out.scanned || 0;
    totals.candidates += out.candidates || 0;
    totals.sent += (out.sent || []).length;
    totals.wouldSend += (out.wouldSend || []).length;
    totals.suppressed += (out.suppressed || []).length;
    totals.buyers += (out.buyers || []).length;
    totals.held += (out.held || []).length;
    totals.needsVerification += (out.needsVerification || []).length;
    totals.failed += (out.failed || []).length;
    for (const f of out.failed || []) failures.push(f);
    for (const r of [...(out.sent || []), ...(out.wouldSend || [])]) {
      byProduct[r.product] = (byProduct[r.product] || 0) + 1;
    }

    const b = out.budgetAfter || out.budget;
    const budgetLine = b ? ` | budget ${b.used}/${b.max} used today (UTC ${b.day})` : "";
    console.log(
      `Pass ${pass}: scanned ${out.scanned || 0}/${out.totalKeys || "?"}, ` +
      `candidates ${out.candidates || 0}, ` +
      (DRY ? `wouldSend ${(out.wouldSend || []).length}` : `sent ${(out.sent || []).length}`) +
      `, suppressed ${(out.suppressed || []).length}, buyers ${(out.buyers || []).length}` +
      `, failed ${(out.failed || []).length}${budgetLine}`
    );

    if (out.quotaHalted) {
      console.log(`\nHALTED: ${out.reason || "send budget reached"}`);
      console.log("Nothing is lost - stranded leads stay at email1_pending. Re-run after 00:00 UTC.");
      break;
    }
    if (!DRY && totals.sent >= MAX_SENDS) {
      console.log(`\nStopping: hit this run's --max of ${MAX_SENDS}. Re-run to continue.`);
      break;
    }
    if (out.scanComplete) {
      console.log("\nReached the end of the lead store.");
      break;
    }
    cursor = out.cursor;
    if (!cursor) {
      console.log("\nNo cursor returned - stopping rather than looping.");
      break;
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Leads scanned:        ${totals.scanned}`);
  console.log(`Stranded (pending):   ${totals.candidates}`);
  console.log(DRY ? `Would send:           ${totals.wouldSend}` : `Sent:                 ${totals.sent}`);
  console.log(`Skipped - suppressed: ${totals.suppressed}`);
  console.log(`Skipped - buyers:     ${totals.buyers}`);
  console.log(`Skipped - held:       ${totals.held}`);
  console.log(`Skipped - unverified: ${totals.needsVerification}`);
  console.log(`Failed:               ${totals.failed}`);
  if (Object.keys(byProduct).length) console.log(`By product:           ${JSON.stringify(byProduct)}`);
  for (const f of failures) console.log(`  FAIL ${f.email}: ${f.error}`);

  if (DRY && totals.candidates > 0) console.log("\nDry run complete. Re-run with --send to fire.");
  if (DRY && totals.candidates === 0) console.log("\nNothing stranded. No leads are sitting at email1_pending.");
})().catch((err) => {
  console.error(`\nStopped: ${err.message}`);
  console.error("Re-running is safe - leads that were sent are no longer candidates.");
  process.exit(1);
});
