#!/usr/bin/env node
/*
 * Upload the built add-on zips to the site's private blob store, one POST per
 * pack, using the admin token in .leads-admin-token (repo root, gitignored).
 *
 *   node scripts/upload-addons.js "<folder with the zips>" [item ...]
 *
 * Example:
 *   node scripts/upload-addons.js ~/Documents/"Carbonated Audio"/"Expansion Packs"/dist
 *
 * Each zip must be named exactly as the catalog `file` for that item
 * (components/addons-catalog.js). Items without a zip in the folder are
 * skipped and listed. Ends by printing what the site now has on file.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE = process.env.SITE || "https://carbonatedaudio.com";
const cat = require(path.join(ROOT, "components", "addons-catalog.js"));

const [dir, ...only] = process.argv.slice(2);
if (!dir) { console.error("usage: node scripts/upload-addons.js <zip folder> [item ...]"); process.exit(1); }
const token = fs.readFileSync(path.join(ROOT, ".leads-admin-token"), "utf8").trim();
if (!token) { console.error("no admin token in .leads-admin-token"); process.exit(1); }

(async () => {
  const skipped = [];
  for (const item of cat.items) {
    if (only.length && !only.includes(item.id)) continue;
    const file = path.join(dir, item.file);
    if (!fs.existsSync(file)) { skipped.push(`${item.id} (${item.file})`); continue; }
    const body = fs.readFileSync(file);
    const res = await fetch(`${SITE}/.netlify/functions/upload-addon-file?item=${encodeURIComponent(item.id)}`, {
      method: "POST",
      headers: { "x-admin-token": token, "Content-Type": "application/zip" },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) { console.error(`FAILED ${item.id}: HTTP ${res.status} ${JSON.stringify(data)}`); process.exitCode = 1; continue; }
    console.log(`uploaded ${item.id}: ${data.bytes} bytes sha256 ${data.sha256.slice(0, 12)}`);
  }
  if (skipped.length) console.log("no zip for: " + skipped.join(", "));
  const list = await fetch(`${SITE}/.netlify/functions/upload-addon-file?token=${encodeURIComponent(token)}`).then((r) => r.json());
  console.log("\nOn the site now:");
  for (const f of list.files) console.log(`  ${f.uploaded ? "OK " : "-- "} ${f.item.padEnd(18)} ${f.status.padEnd(12)} ${f.uploaded ? `${f.bytes} bytes, ${f.uploaded_at}` : "not uploaded"}`);
})().catch((err) => { console.error(err.message); process.exit(1); });
