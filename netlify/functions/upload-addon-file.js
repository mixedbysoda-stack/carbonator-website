// Admin upload for add-on deliverables (expansion pack / template zips).
//
// The zips live in a Netlify Blob store ("addon-files") rather than in the
// public website repo, so they are never reachable by URL. download-addon.js
// hands them out only after re-checking the buyer's Stripe session.
//
//   POST /.netlify/functions/upload-addon-file?item=pack_pour
//        header  x-admin-token: <LEADS_ADMIN_TOKEN>
//        body    the zip, raw bytes (Content-Type: application/zip)
//   GET  /.netlify/functions/upload-addon-file?token=<LEADS_ADMIN_TOKEN>
//        -> what is uploaded: item, file name, bytes, sha256, uploaded_at
//
// scripts/upload-addons.js drives the POST for every built pack.
const crypto = require("crypto");
const { getBlobStore } = require("./lib/store");
const { PRODUCTS, ADDONS } = require("./config");

const STORE = "addon-files";

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}

function authed(event) {
  const token = event.headers["x-admin-token"] || event.queryStringParameters?.token;
  return Boolean(process.env.LEADS_ADMIN_TOKEN) && token === process.env.LEADS_ADMIN_TOKEN;
}

exports.handler = async (event) => {
  if (!authed(event)) return json(401, { error: "Unauthorized" });
  const store = getBlobStore(STORE);

  if (event.httpMethod === "GET") {
    const out = [];
    for (const item of ADDONS.items) {
      const meta = await store.get(`meta_${item.id}`, { type: "json" }).catch(() => null);
      out.push({ item: item.id, file: item.file, status: item.status, uploaded: Boolean(meta), ...(meta || {}) });
    }
    return json(200, { files: out });
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const itemId = String(event.queryStringParameters?.item || "");
  const item = PRODUCTS[itemId];
  if (!item || item.type !== "addon") return json(400, { error: `Unknown add-on "${itemId}"` });

  const bytes = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
  if (bytes.length < 100) return json(400, { error: "Body is not a zip" });
  // A zip starts with PK\x03\x04 (or PK\x05\x06 for an empty archive).
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) return json(400, { error: "Body is not a zip" });

  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  await store.set(`file_${itemId}`, bytes);
  const meta = { file: item.asset.name, bytes: bytes.length, sha256, uploaded_at: new Date().toISOString() };
  await store.setJSON(`meta_${itemId}`, meta);
  console.log(`upload-addon-file: ${itemId} ${bytes.length} bytes ${sha256.slice(0, 12)}`);
  return json(200, { ok: true, item: itemId, ...meta });
};
