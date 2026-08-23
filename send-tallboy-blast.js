#!/usr/bin/env node
// send-tallboy-blast.js - run this ON YOUR MAC from the repo folder.
// Reads the leads CSV + your customer list, dedupes, drops suppressed and
// test rows, then fires the deployed send-campaign endpoint in batches of 100.
//
// Usage:
//   node send-tallboy-blast.js --csv "/Users/soda/Downloads/Carbonator Leads - Leads.csv" --dry-run
//   node send-tallboy-blast.js --csv "/Users/soda/Downloads/Carbonator Leads - Leads.csv" --send
//
// Prereqs (one time):
//   1. CAMPAIGN_SEND_SECRET set in Netlify env vars (site: carbinated-audio)
//   2. Same value saved in .campaign-secret in this folder (gitignored)
//   3. Optional: customers.txt in this folder, one email per line, to include
//      past buyers who are not on the leads sheet.
//
// Resume safety: if campaign-audience-skip.json exists in this folder (a JSON
// array of addresses already attempted in a previous run), those addresses are
// excluded so a re-run never double-sends. The 2026-08-22 run died at the
// function timeout after 89 sends; that file holds those 89. Both the file and
// this pattern are gitignored (campaign-audience-*.json).
//
// No email addresses are hardcoded here. Suppression comes from
// netlify/functions/lib/suppression.js (static) plus the endpoint re-checks
// the dynamic bounce list server-side on every recipient.

const fs = require("fs");
const path = require("path");

const ENDPOINT = "https://carbonatedaudio.com/.netlify/functions/send-campaign";
const { SUPPRESSED } = require("./netlify/functions/lib/suppression.js");

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const DRY = args.includes("--dry-run") || !args.includes("--send");
const csvPath = getArg("--csv");
if (!csvPath) {
  console.error('Missing --csv "/path/to/Carbonator Leads - Leads.csv"');
  process.exit(1);
}

const secretPath = path.join(__dirname, ".campaign-secret");
if (!fs.existsSync(secretPath)) {
  console.error("Missing .campaign-secret in this folder. Create it with the same value as the CAMPAIGN_SEND_SECRET Netlify env var.");
  process.exit(1);
}
const SECRET = fs.readFileSync(secretPath, "utf8").trim();

// --- minimal CSV parse (handles quoted fields) ---
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = parseCsv(fs.readFileSync(csvPath, "utf8"));
const header = raw[0];
const emailIdx = header.findIndex((h) => h.trim().toLowerCase() === "email");
const srcIdx = header.findIndex((h) => h.trim().toLowerCase() === "first source");
const src2Idx = header.findIndex((h) => h.trim().toLowerCase() === "latest source");

const TEST = /(test|example\.com|audit|pipeline)/i;
const suppressed = new Set(SUPPRESSED.map((e) => e.toLowerCase()));
// Held pending your call: mangor@web.de is suppressed and mangow@web.de is one
// character away on the same domain. If the suppression entry was a typo for
// mangow, emailing mangow mails the person who opted out. Excluded until you
// confirm they are two different people (then delete this line).
suppressed.add("mangow@web.de");
suppressed.add("mixedbysoda@gmail.com");

// Already attempted in a previous run - never send twice.
const skipSet = new Set();
const skipPath = path.join(__dirname, "campaign-audience-skip.json");
if (fs.existsSync(skipPath)) {
  try {
    for (const e of JSON.parse(fs.readFileSync(skipPath, "utf8"))) {
      skipSet.add(String(e).trim().toLowerCase());
    }
  } catch (err) {
    console.error(`Could not parse ${skipPath}: ${err.message}`);
    process.exit(1);
  }
}

const seen = new Set();
const audience = [];
const skipped = { suppressed: [], resumed: 0, test: [], dupes: 0, invalid: 0 };

function add(email, why) {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) { skipped.invalid++; return; }
  if (seen.has(e)) { skipped.dupes++; return; }
  seen.add(e);
  if (TEST.test(e)) { skipped.test.push(e); return; }
  if (skipSet.has(e)) { skipped.resumed++; return; }
  if (suppressed.has(e)) { skipped.suppressed.push(e); return; }
  audience.push(e);
}

for (const r of raw.slice(1)) {
  const srcBlob = `${r[srcIdx] || ""} ${r[src2Idx] || ""}`;
  if (TEST.test(srcBlob)) { skipped.test.push(r[emailIdx]); seen.add(String(r[emailIdx] || "").toLowerCase()); continue; }
  add(r[emailIdx], "leads");
}

const customersPath = path.join(__dirname, "customers.txt");
if (fs.existsSync(customersPath)) {
  for (const line of fs.readFileSync(customersPath, "utf8").split("\n")) add(line, "customers");
}

console.log(`Audience: ${audience.length} unique sendable addresses`);
console.log(`Skipped - already attempted in a previous run (resume): ${skipped.resumed}`);
console.log(`Skipped - suppressed/held: ${skipped.suppressed.length} ${JSON.stringify(skipped.suppressed)}`);
console.log(`Skipped - test rows: ${skipped.test.length}, dupes: ${skipped.dupes}, invalid: ${skipped.invalid}`);

const p = (t) => `<p style="color:#a09bb5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;margin:0 0 16px;">${t}</p>`;
const tokens = {
  product: "tallboy",
  headline: "TALLBOY - your track, played back on a handheld",
  body: [
    "New one out, and it is the strangest thing we have made. TALLBOY listens to the pitch of whatever you feed it - a vocal, a bass line, a hummed hook - and replays that performance through a four-channel handheld-console sound chip. Not a filter over the top: an actual chip voice following your line, with a tempo-synced arp and a bitcrusher behind it.",
    "There are no knobs. You drive it with a D-pad and a four-shade dot-matrix screen, like the hardware it is modelled on. $20 one-time, same as always: no subscription, no iLok, three machines, free demo with no email wall.",
    '<strong style="color:#ffffff;">Also - a quiet feature you may have missed.</strong> If you own any of our plugins, your purchase email has your personal referral link at the bottom. When someone buys through it, you get our next plugin free. TALLBOY counts, both directions: share your link, or buy TALLBOY and start sharing its link.',
    "As always, just reply if you have questions - it is still me reading these.",
  ].map(p).join(""),
  features: [
    "CHIP 4CH RESYNTH - pitch-tracked resynthesis on four modelled channels",
    "ARP + GLIDE - host-synced, five modes, up to four octaves",
    "CRUSH ROM - 1-16 bit, rate divide with jitter, post filter",
    "No knobs: D-pad + dot-matrix screen",
    "$20 one-time - no subscription, no iLok, 3 machines",
  ],
  ctaText: "Hear TALLBOY - $20",
  ctaUrl: "https://carbonatedaudio.com/tallboy?utm_source=email&utm_medium=leads&utm_campaign=tallboy-launch",
  preheader: "A chip voice that follows your line - and your referral link now earns you the next plugin free.",
};
const subject = "TALLBOY is out - and your link earns you the next plugin free";

(async () => {
  const batches = [];
  for (let i = 0; i < audience.length; i += 100) batches.push(audience.slice(i, i + 100));
  console.log(`${batches.length} batch(es). Mode: ${DRY ? "DRY RUN (nothing sends)" : "LIVE SEND"}`);

  for (let i = 0; i < batches.length; i++) {
    const body = { subject, variant: "spotlight", tokens, to: batches[i], dryRun: DRY };
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-campaign-secret": SECRET },
      body: JSON.stringify(body),
    });
    const out = await res.json();
    if (!DRY && res.status === 200 && Array.isArray(out.sent)) {
      // Record successful sends immediately so any later failure can resume safely.
      for (const e of out.sent) skipSet.add(e);
      fs.writeFileSync(skipPath, JSON.stringify([...skipSet], null, 2));
    }
    const summary = DRY
      ? `wouldSend: ${(out.wouldSend || []).length}, suppressed: ${(out.suppressed || []).length}, v: ${out.v || 1}`
      : `sent: ${(out.sent || []).length}, suppressed: ${(out.suppressed || []).length}, failed: ${(out.failed || []).length}, v: ${out.v || 1}`;
    console.log(`Batch ${i + 1}/${batches.length} [${res.status}]: ${res.status === 200 ? summary : JSON.stringify(out).slice(0, 400)}`);
    if (res.status !== 200) { console.error("Stopping - fix the error above before continuing. Re-running is safe: successful batches were recorded in campaign-audience-skip.json."); process.exit(1); }
  }
  console.log(DRY ? "Dry run complete. Re-run with --send to fire." : "All batches sent. Sent addresses recorded in campaign-audience-skip.json.");
})();
