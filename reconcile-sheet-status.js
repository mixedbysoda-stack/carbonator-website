#!/usr/bin/env node
// reconcile-sheet-status.js - run this ON YOUR MAC from the repo folder.
//
// Repairs the "Drip Status" column in the Carbonator Leads Google Sheet from
// Netlify Blobs, which is the system of record.
//
// Usage:
//   node reconcile-sheet-status.js --dry-run
//   node reconcile-sheet-status.js --send
//
// Prereqs:
//   1. LEADS_ADMIN_TOKEN saved in .leads-admin-token in this folder (gitignored)
//   2. google-sheets-backup/Code.gs redeployed with the `status_update` branch
//      (see the header of that file) - without it this does nothing useful.
//
// WHY THE COLUMN IS WRONG: capture-lead.js writes the Sheet row *before* the
// welcome email is attempted, while the lead still reads "email1_pending", and
// only flips it to "email1_sent" afterwards - in Blobs alone. The normal sync
// path cannot carry that later flip because the Apps Script dedupes on event_id
// and returns "duplicate" for a lead it has already seen. So the column froze
// at capture-time state and drifted further with every drip send.
//
// On 2026-08-23 that drift produced a false alarm: an export showed 59 of 270
// leads at "email1_pending", which read as months of silently failed welcome
// sends leaving people stranded outside the nurture sequence. Checking Blobs
// directly, all 59 were already at email1_sent/email2_sent/email3_sent with
// real send timestamps. Nobody was stranded; the report was lying.
//
// SAFETY: this only ever rewrites column 7. The Apps Script's status_update
// path never increments Lead Count and never appends a row - which is exactly
// why this is replay-safe where the old full backfill was not. An address the
// Sheet has never seen is reported as "missing" rather than created, so
// attribution columns cannot be filled with blanks.
//
// One address can hold several lead records. This sends the furthest-along
// status per address (see netlify/functions/lib/drip-status.js), never a
// regression.

const fs = require("fs");
const path = require("path");
const { furthestAlong, dripRank } = require("./netlify/functions/lib/drip-status.js");

const BASE = "https://carbonatedaudio.com/.netlify/functions/backfill-leads-to-sheets";
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run") || !args.includes("--send");

const tokenPath = path.join(__dirname, ".leads-admin-token");
if (!fs.existsSync(tokenPath)) {
  console.error("Missing .leads-admin-token in this folder.");
  console.error("Create it with the value of the LEADS_ADMIN_TOKEN Netlify env var:");
  console.error("  netlify env:get LEADS_ADMIN_TOKEN > .leads-admin-token");
  process.exit(1);
}
const TOKEN = fs.readFileSync(tokenPath, "utf8").trim();

async function call(url, init) {
  const res = await fetch(url, init);
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
  console.log(`Mode: ${DRY ? "DRY RUN (Sheet untouched)" : "LIVE WRITE"}\n`);

  // Phase 1 - read every lead record, reduce to one status per address.
  const merged = new Map();
  let cursor = null;
  let pass = 0;
  let scannedTotal = 0;

  while (true) {
    pass++;
    const q = new URLSearchParams({ token: TOKEN, mode: "scan-status", limit: "40" });
    if (cursor) q.set("startAfter", cursor);
    const out = await call(`${BASE}?${q}`);
    scannedTotal += out.scanned;
    for (const [email, status] of Object.entries(out.statuses || {})) {
      merged.set(email, furthestAlong(merged.get(email), status));
    }
    process.stdout.write(`\rScanning: ${scannedTotal}/${out.totalKeys} records, ${merged.size} unique addresses`);
    if (out.scanComplete) break;
    cursor = out.cursor;
    if (!cursor) break;
  }
  console.log("\n");

  const byStatus = {};
  for (const s of merged.values()) byStatus[s] = (byStatus[s] || 0) + 1;
  console.log("True status in Blobs:", JSON.stringify(byStatus));

  // Phase 2 - push each address's true status to the Sheet.
  const updates = [...merged.entries()]
    .sort((a, b) => dripRank(a[1]) - dripRank(b[1]))
    .map(([contact, drip_status]) => ({ contact, drip_status }));

  const totals = { updated: 0, unchanged: 0, missing: 0, failed: 0 };
  const failures = [];
  const missing = [];

  for (let i = 0; i < updates.length; i += 50) {
    const batch = updates.slice(i, i + 50);
    const out = await call(`${BASE}?token=${encodeURIComponent(TOKEN)}&mode=push-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: batch, dryRun: DRY }),
    });
    totals.updated += (out.updated || []).length;
    totals.unchanged += (out.unchanged || []).length;
    totals.missing += (out.missing || []).length;
    totals.failed += (out.failed || []).length;
    failures.push(...(out.failed || []));
    missing.push(...(out.missing || []));
    console.log(
      `Batch ${Math.floor(i / 50) + 1}/${Math.ceil(updates.length / 50)}: ` +
      `${DRY ? "would update" : "updated"} ${(out.updated || []).length}, ` +
      `unchanged ${(out.unchanged || []).length}, missing ${(out.missing || []).length}, failed ${(out.failed || []).length}`
    );
  }

  console.log("\n--- Summary ---");
  console.log(`Lead records scanned:  ${scannedTotal}`);
  console.log(`Unique addresses:      ${merged.size}`);
  console.log(`${DRY ? "Would write:" : "Written:"}           ${totals.updated}`);
  console.log(`Already correct:       ${totals.unchanged}`);
  console.log(`Not in the Sheet:      ${totals.missing}`);
  console.log(`Failed:                ${totals.failed}`);
  for (const m of missing.slice(0, 10)) console.log(`  missing: ${m}`);
  if (missing.length > 10) console.log(`  ...and ${missing.length - 10} more`);
  for (const f of failures.slice(0, 10)) console.log(`  FAIL ${f.contact}: ${f.error}`);

  if (DRY) console.log("\nDry run complete. Re-run with --send to write the Sheet.");
})().catch((err) => {
  console.error(`\nStopped: ${err.message}`);
  console.error("Re-running is safe - this only ever rewrites the Drip Status cell.");
  process.exit(1);
});
