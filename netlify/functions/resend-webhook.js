const crypto = require("crypto");
const { suppress } = require("./lib/suppression");

// Resend signs webhooks with the Svix scheme. Verifying is what stops anyone
// who finds this URL from suppressing arbitrary addresses — i.e. from quietly
// cutting real customers out of every future send.
function verifySignature(event) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: "RESEND_WEBHOOK_SECRET is not configured" };

  const id = event.headers["svix-id"] || event.headers["webhook-id"];
  const timestamp = event.headers["svix-timestamp"] || event.headers["webhook-timestamp"];
  const signatureHeader = event.headers["svix-signature"] || event.headers["webhook-signature"];
  if (!id || !timestamp || !signatureHeader) return { ok: false, reason: "missing signature headers" };

  // Reject anything old enough to be a replay of a captured request.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return { ok: false, reason: "timestamp outside tolerance" };

  const key = Buffer.from(String(secret).replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${id}.${timestamp}.${event.body}`)
    .digest("base64");

  // The header carries a space-separated list so a secret can be rotated
  // without dropping deliveries mid-flight.
  const provided = String(signatureHeader)
    .split(" ")
    .map((part) => part.split(",").pop());

  const expectedBuf = Buffer.from(expected);
  const match = provided.some((candidate) => {
    const candidateBuf = Buffer.from(candidate || "");
    return candidateBuf.length === expectedBuf.length && crypto.timingSafeEqual(candidateBuf, expectedBuf);
  });

  return match ? { ok: true } : { ok: false, reason: "signature mismatch" };
}

// A bounce means the address does not exist; a complaint means they marked us
// as spam. Both must stop the next send, or Resend's reputation — and every
// other email this business depends on — degrades.
const SUPPRESSING_EVENTS = new Set(["email.bounced", "email.complained"]);

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const verification = verifySignature(event);
  if (!verification.ok) {
    console.error("Resend webhook rejected:", verification.reason);
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid signature" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid body" }) };
  }

  const type = payload && payload.type;
  if (!SUPPRESSING_EVENTS.has(type)) {
    return { statusCode: 200, headers, body: JSON.stringify({ ignored: type || "unknown" }) };
  }

  // Resend classifies bounces as Permanent, Transient, or Undetermined. Only a
  // Permanent bounce means the address is genuinely dead. Transient is a full
  // mailbox or a server hiccup, and Undetermined means Resend could not tell —
  // suppressing on either would drop people whose email works fine.
  if (type === "email.bounced") {
    const bounceType = String(payload?.data?.bounce?.type || "").toLowerCase();
    if (bounceType !== "permanent") {
      return { statusCode: 200, headers, body: JSON.stringify({ ignored: `non-permanent bounce (${bounceType || "unspecified"})` }) };
    }
  }

  const recipients = []
    .concat(payload?.data?.to || [])
    .concat(payload?.data?.email || [])
    .filter(Boolean);

  const suppressed = [];
  for (const address of recipients) {
    try {
      if (await suppress(address, type)) suppressed.push(address);
    } catch (err) {
      console.error(`Suppression write failed for ${address}:`, err.message);
    }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ type, suppressed }) };
};
