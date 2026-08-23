// Post-purchase review request — Day 7 after purchase
// Trigger: run via scheduled cron or manual invoke
// Checks Stripe for purchases 7+ days old, sends review request if not already sent

const { getBlobStore } = require("./lib/store");
const { isSuppressedAsync } = require("./lib/suppression");
const { Resend } = require("resend");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";

// Map the `product` id stored by stripe-webhook onto a display name + URL.
// Fallback = Carbonator (older buyer blobs have no product field).
const PRODUCT_INFO = {
  carbonator: { name: "Carbonator", url: "https://carbonatedaudio.com/carbonator" },
  desipper: { name: "De-Sipper", url: "https://carbonatedaudio.com/desipper" },
  ontap: { name: "On Tap", url: "https://carbonatedaudio.com/ontap" },
  pour: { name: "Pour", url: "https://carbonatedaudio.com/pour" },
  // Tonic's product page is offline (rename pending) — point owners at the hub.
  tonic: { name: "Tonic", url: "https://carbonatedaudio.com" },
  octane: { name: "FIZZFUEL", url: "https://carbonatedaudio.com/fizzfuel" },
  fizzfuel: { name: "FIZZFUEL", url: "https://carbonatedaudio.com/fizzfuel" },
  still: { name: "Still", url: "https://carbonatedaudio.com/still" },
  tallboy: { name: "TALLBOY", url: "https://carbonatedaudio.com/tallboy" },
  bundle: { name: "the Complete Bundle", url: "https://carbonatedaudio.com/bundle" },
  bundle5: { name: "the Complete Bundle", url: "https://carbonatedaudio.com/bundle" },
  vocal_bundle: { name: "the Vocal Chain Bundle", url: "https://carbonatedaudio.com/bundle" },
  mixbus_bundle: { name: "the Mix Bus Bundle", url: "https://carbonatedaudio.com/bundle" },
  apd_bundle: { name: "your APD 3-in-1 Bundle", url: "https://carbonatedaudio.com" },
};

function getProductInfo(buyer) {
  const key = (buyer && buyer.product ? String(buyer.product) : "").toLowerCase();
  return PRODUCT_INFO[key] || PRODUCT_INFO.carbonator;
}

exports.handler = async () => {
  if (!process.env.RESEND_API_KEY) {
    return { statusCode: 200, body: "No RESEND_API_KEY — skipping" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const store = getBlobStore("review-requests");

  // Use a simple list of buyer emails stored by stripe-webhook
  const buyerStore = getBlobStore("buyers");
  let buyers;
  try {
    const { blobs } = await buyerStore.list();
    buyers = blobs;
  } catch {
    return { statusCode: 200, body: "No buyers store yet" };
  }

  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  let sent = 0;

  for (const blob of buyers) {
    try {
      const buyer = await buyerStore.get(blob.key, { type: "json" });
      if (!buyer || !buyer.email) continue;
      if (await isSuppressedAsync(buyer.email)) continue; // unsubscribed, bounced, or complained
      if (!buyer.purchased_at) continue;

      const elapsed = now - new Date(buyer.purchased_at).getTime();
      if (elapsed < SEVEN_DAYS) continue;

      // Check if already sent
      const alreadySent = await store.get(`review_${buyer.email}`).catch(() => null);
      if (alreadySent) continue;

      const info = getProductInfo(buyer);
      await resend.emails.send({
        from: FROM_EMAIL,
        reply_to: "mixedbysoda@gmail.com",
        to: buyer.email,
        subject: `Quick question about ${info.name.replace(/^the |^your /, "")}`,
        html: buildReviewEmail(buyer.email, info),
      });

      await store.set(`review_${buyer.email}`, new Date().toISOString());
      sent++;
      console.log(`Review request sent to ${buyer.email}`);
    } catch (err) {
      console.error(`Review request failed for ${blob.key}:`, err.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ sent }),
  };
};

function buildReviewEmail(email, info) {
  const productName = info && info.name ? info.name : "Carbonator";
  const productUrl = info && info.url ? info.url : "https://carbonatedaudio.com/carbonator";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0a1a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0a1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:28px;font-weight:800;color:#ffffff;">Carbonated Audio</span>
        </td></tr>

        <tr><td style="background-color:#1a1430;border-radius:16px;padding:40px 32px;">

          <h1 style="color:#ffffff;font-size:22px;margin:0 0 16px;">How's ${productName.replace(/^the |^your /, "")} working for you?</h1>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 20px;">
            You've had <a href="${productUrl}" style="color:#a09bb5;">${productName}</a> for about a week now — I'd love to hear how it's fitting into your workflow.
          </p>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 20px;">
            If you have a minute, could you reply with a quick line about:
          </p>

          <ul style="color:#a09bb5;font-size:15px;line-height:1.8;padding-left:20px;margin:0 0 24px;">
            <li>What do you use it on most?</li>
            <li>What's working — and what's missing?</li>
            <li>Would you recommend it to other producers?</li>
          </ul>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Even a single sentence helps — I'm a solo developer and real feedback from real producers means the world. I may feature your quote on the site (with your permission of course).
          </p>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 8px;">
            Thanks for supporting independent audio software.
          </p>

          <p style="color:#ffffff;font-size:15px;margin:0;">
            — Miguel, Carbonated Audio
          </p>

        </td></tr>

        <tr><td align="center" style="padding-top:32px;">
          <p style="color:#6b6580;font-size:12px;margin:0;">
            &copy; ${new Date().getFullYear()} Carbonated Audio &middot; <a href="https://carbonatedaudio.com" style="color:#6b6580;">carbonatedaudio.com</a><br><a href="mailto:hello@carbonatedaudio.com?subject=Unsubscribe" style="color:#6b6580;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
