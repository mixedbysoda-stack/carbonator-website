// Delivers an add-on (expansion pack / Pro Tools template) to someone who
// bought it, either on its own or inside a bundle such as the Mega Bundle.
//
// GET /.netlify/functions/download-addon?session=cs_...&item=pack_pour
//
// Every click is re-checked against Stripe: the session must be paid, not
// refunded, and entitle this item. Then the zip is served from the private
// Netlify Blob store "addon-files" (uploaded with upload-addon-file.js). The
// file never has a public address, so nothing leaks if a zip name gets out.
//
// Fallback, only if ADDONS_GITHUB_TOKEN is set and the blob is missing: fetch
// the asset from the private GitHub release named in the catalog and redirect
// to its signed URL.
const Stripe = require("stripe");
const { PRODUCTS } = require("./config");
const { entitledIds } = require("./lib/addon-links");
const { getBlobStore } = require("./lib/store");

function text(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    body,
  };
}

const HELP = " If this looks wrong, reply to your order email or write to mixedbysoda@gmail.com.";

async function signedAssetUrl({ repo, tag, name }, token) {
  const gh = {
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "carbonatedaudio-download-addon",
  };
  const rel = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, {
    headers: { ...gh, Accept: "application/vnd.github+json" },
  });
  if (!rel.ok) throw new Error(`release lookup ${repo}@${tag}: HTTP ${rel.status}`);
  const release = await rel.json();
  const asset = (release.assets || []).find((a) => a.name === name);
  if (!asset) throw new Error(`asset ${name} not found on ${repo}@${tag}`);

  // The asset API answers with a 302 to a signed, expiring download URL.
  // Node's fetch hands back the real 3xx with redirect: "manual".
  const res = await fetch(asset.url, {
    headers: { ...gh, Accept: "application/octet-stream" },
    redirect: "manual",
  });
  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && location) return location;
  throw new Error(`asset ${name}: expected a redirect, got HTTP ${res.status}`);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return text(405, "Method not allowed");

  const sessionId = String(event.queryStringParameters?.session || "");
  const itemId = String(event.queryStringParameters?.item || "");

  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) return text(400, "That download link is incomplete." + HELP);
  const item = PRODUCTS[itemId];
  if (!item || item.type !== "addon") return text(404, "Unknown add-on." + HELP);

  let session;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge"],
    });
  } catch (err) {
    console.error("download-addon: session lookup failed:", err.message);
    return text(403, "We could not find that order." + HELP);
  }

  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return text(403, "That order is not paid." + HELP);
  }
  const charge = session.payment_intent && session.payment_intent.latest_charge;
  if (charge && typeof charge === "object" && charge.refunded) {
    return text(403, "That order was refunded, so its downloads are closed." + HELP);
  }

  // What the order bought, frozen at purchase by the webhook; the catalog is
  // only the fallback for orders whose metadata writeback failed.
  const frozen = String(session.metadata?.addons || "").split(",").filter(Boolean);
  const owned = frozen.length ? frozen : entitledIds(PRODUCTS, session.metadata?.product || "");
  if (!owned.includes(itemId)) return text(403, "That order does not include this add-on." + HELP);

  if (!item.released) {
    return text(409, `${item.name} is not released yet. We email you the download the day it drops.` + HELP);
  }

  // Primary: the blob store. Zips are small (well under the 6 MB function
  // response limit), so they are returned inline as an attachment.
  try {
    const blob = await getBlobStore("addon-files").get(`file_${itemId}`, { type: "arrayBuffer" });
    if (blob && blob.byteLength > 0) {
      console.log(`download-addon: ${itemId} (${blob.byteLength} bytes) for ${sessionId.slice(0, 16)}...`);
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${item.asset.name}"`,
          "Content-Length": String(blob.byteLength),
          "Cache-Control": "no-store",
        },
        body: Buffer.from(blob).toString("base64"),
        isBase64Encoded: true,
      };
    }
  } catch (err) {
    console.error("download-addon: blob read failed:", err.message);
  }

  const token = process.env.ADDONS_GITHUB_TOKEN;
  if (token) {
    try {
      const url = await signedAssetUrl(item.asset, token);
      console.log(`download-addon: ${itemId} via GitHub for ${sessionId.slice(0, 16)}...`);
      return { statusCode: 302, headers: { Location: url, "Cache-Control": "no-store" }, body: "" };
    } catch (err) {
      console.error("download-addon:", err.message);
    }
  }

  console.error(`download-addon: no file uploaded for ${itemId}`);
  return text(503, `${item.name} is still being prepared. Please try again in a few minutes; your link keeps working.` + HELP);
};
