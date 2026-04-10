const Stripe = require("stripe");
const { Resend } = require("resend");
const { getBlobStore } = require("./lib/store");
const {
  VERSION,
  DOWNLOAD_URLS,
  PRODUCTS,
  generateActivationKey,
} = require("./config");
const { generateRefCode } = require("./referral");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = event.headers["stripe-signature"];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    if (session.payment_status !== "paid") {
      console.log("Session not paid, skipping email");
      return { statusCode: 200, body: "Not paid — skipped" };
    }

    const email = session.customer_details?.email;
    if (!email) {
      console.error("No customer email found in session");
      return { statusCode: 200, body: "No email — skipped" };
    }

    // Detect product from metadata or payment link metadata
    const productId = session.metadata?.product || "carbonator";
    const product = PRODUCTS[productId] || PRODUCTS.carbonator;

    const amountPaid = session.amount_total
      ? `$${(session.amount_total / 100).toFixed(2)}`
      : `$${product.price}.00`;
    const orderId = session.id;

    // Handle bundle purchases — generate two keys, send one email
    if (product.isBundle) {
      const bundleKeys = {};
      for (const includedId of product.includes) {
        const includedProduct = PRODUCTS[includedId];
        const secret = process.env[includedProduct.secretEnv];
        if (secret) {
          bundleKeys[includedId] = generateActivationKey(email, session.created, secret);
        }
      }

      // Store keys in session metadata
      try {
        await stripe.checkout.sessions.update(session.id, {
          metadata: {
            license_key_carbonator: bundleKeys.carbonator || "",
            license_key_desipper: bundleKeys.desipper || "",
            product: "bundle",
          },
        });
      } catch (err) {
        console.error("Failed to store bundle keys in session:", err.message);
      }

      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const emailHtml = buildBundleEmail({
          email,
          amountPaid,
          orderId,
          carbonatorKey: bundleKeys.carbonator,
          desipperKey: bundleKeys.desipper,
          refCode: generateRefCode(email),
        });

        await resend.emails.send({
          from: "Carbonated Audio <hello@carbonatedaudio.com>",
          to: email,
          subject: "Your Carbonated Audio Bundle — License Keys & Downloads",
          html: emailHtml,
        });

        console.log(`Bundle delivery email sent to ${email}`);
      } catch (err) {
        console.error("Failed to send bundle email:", err.message);
        return { statusCode: 200, body: "Bundle email send failed" };
      }
    } else {
      // Single product purchase
      const licenseSecret = process.env[product.secretEnv];
      let licenseKey = session.metadata?.license_key;

      if (!licenseKey && licenseSecret) {
        licenseKey = generateActivationKey(email, session.created, licenseSecret);
        try {
          await stripe.checkout.sessions.update(session.id, {
            metadata: { license_key: licenseKey, product: productId },
          });
        } catch (err) {
          console.error("Failed to store license key in session:", err.message);
        }
      }

      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const emailHtml = productId === "desipper"
          ? buildDesipperEmail({ email, amountPaid, orderId, licenseKey, refCode: generateRefCode(email) })
          : buildEmail({ email, amountPaid, orderId, licenseKey, refCode: generateRefCode(email) });

        await resend.emails.send({
          from: "Carbonated Audio <hello@carbonatedaudio.com>",
          to: email,
          subject: productId === "desipper"
            ? "Your De-Sipper License Key & Download Links"
            : "Your Carbonator License Key & Download Links",
          html: emailHtml,
        });

        console.log(`Delivery email sent to ${email}`);
      } catch (err) {
        console.error("Failed to send delivery email:", err.message);
        return { statusCode: 200, body: "Email send failed" };
      }
    }

    // Store buyer for review-request drip
    try {
      const buyerStore = getBlobStore("buyers");
      await buyerStore.setJSON(`buyer_${email}`, {
        email,
        purchased_at: new Date().toISOString(),
        amount: amountPaid,
        order_id: orderId,
      });
    } catch (err) {
      console.error("Failed to store buyer:", err.message);
    }
  }

  return { statusCode: 200, body: "OK" };
};

function buildEmail({ email, amountPaid, orderId, licenseKey, refCode }) {
  const refLink = `https://carbonatedaudio.com/.netlify/functions/referral?action=track&ref=${refCode}`;
  const licenseSection = licenseKey
    ? `
              <!-- License Key -->
              <h2 style="color:#ffffff;font-size:18px;margin:0 0 12px;text-align:center;">Your License Key</h2>
              <div style="background:#0d0a1a;padding:16px;border-radius:8px;border:1px solid #2a2440;text-align:center;margin-bottom:8px;">
                <code style="font-size:13px;color:#ff8c42;letter-spacing:0.5px;word-break:break-all;font-family:'Courier New',Courier,monospace;">${licenseKey}</code>
              </div>
              <p style="color:#a09bb5;font-size:13px;text-align:center;margin:0 0 32px;">
                Paste this key into the Carbonator plugin to activate it.<br>Each key works on up to 3 machines.
              </p>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0d0a1a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0a1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:28px;font-weight:800;color:#ffffff;">Carbonated Audio</span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color:#1a1430;border-radius:16px;padding:40px 32px;">

              <!-- Checkmark -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="width:60px;height:60px;border-radius:50%;background-color:rgba(16,185,129,0.15);border:2px solid #10b981;line-height:60px;text-align:center;font-size:28px;">
                      &#10003;
                    </div>
                  </td>
                </tr>
              </table>

              <h1 style="color:#ffffff;font-size:24px;text-align:center;margin:0 0 8px;">Thank you for your purchase!</h1>
              <p style="color:#a09bb5;font-size:16px;text-align:center;margin:0 0 32px;">Your Carbonator v${VERSION} download links are below.</p>

              ${licenseSection}

              <!-- Download Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <a href="${DOWNLOAD_URLS.mac}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#ff6b2b,#ff8c42);color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">
                      Download for macOS (.pkg)
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${DOWNLOAD_URLS.windows}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#ff6b2b,#ff8c42);color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">
                      Download for Windows (.zip)
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #2a2440;margin:0 0 24px;">

              <!-- Receipt -->
              <h2 style="color:#ffffff;font-size:16px;margin:0 0 16px;">Order Details</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                <tr>
                  <td style="color:#a09bb5;padding:4px 0;">Product</td>
                  <td style="color:#ffffff;text-align:right;padding:4px 0;">Carbonator v${VERSION}</td>
                </tr>
                <tr>
                  <td style="color:#a09bb5;padding:4px 0;">Amount</td>
                  <td style="color:#ffffff;text-align:right;padding:4px 0;">${amountPaid}</td>
                </tr>
                <tr>
                  <td style="color:#a09bb5;padding:4px 0;">Email</td>
                  <td style="color:#ffffff;text-align:right;padding:4px 0;">${email}</td>
                </tr>
                <tr>
                  <td style="color:#a09bb5;padding:4px 0;">Order ID</td>
                  <td style="color:#ffffff;text-align:right;padding:4px 0;font-size:11px;word-break:break-all;">${orderId}</td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">

              <!-- Installation -->
              <h2 style="color:#ffffff;font-size:16px;margin:0 0 12px;">Quick Start</h2>
              <ol style="color:#a09bb5;font-size:14px;padding-left:20px;margin:0;">
                <li style="margin-bottom:8px;"><strong style="color:#ffffff;">macOS:</strong> Open the .pkg installer and choose your formats (VST3, AU, AAX, Standalone).</li>
                <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Windows:</strong> Extract the .zip and copy the VST3 plugin to <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;">C:\\Program Files\\Common Files\\VST3\\</code></li>
                <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Activate:</strong> Open the plugin, paste your license key, and click Activate.</li>
                <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Rescan plugins</strong> in your DAW, then drop Carbonator on a track.</li>
              </ol>

              <!-- Referral Section -->
              <hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">
              <h2 style="color:#ffffff;font-size:16px;margin:0 0 12px;">Share Carbonator, earn credit</h2>
              <p style="color:#a09bb5;font-size:14px;line-height:1.6;margin:0 0 16px;">
                Know a producer who'd love Carbonator? Share your personal referral link. When someone buys through it, you'll get a free copy of our next plugin.
              </p>
              <div style="background:#0d0a1a;padding:12px 16px;border-radius:8px;border:1px solid #2a2440;text-align:center;margin-bottom:8px;">
                <a href="${refLink}" style="color:#ff8c42;font-size:13px;word-break:break-all;text-decoration:none;">${refLink}</a>
              </div>
              <p style="color:#6b6580;font-size:12px;text-align:center;margin:0;">Copy this link and share it anywhere.</p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="color:#6b6580;font-size:12px;margin:0;">
                Need help? Reply to this email or contact mixedbysoda@gmail.com
              </p>
              <p style="color:#6b6580;font-size:12px;margin:8px 0 0;">
                &copy; ${new Date().getFullYear()} Carbonated Audio
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildDesipperEmail({ email, amountPaid, orderId, licenseKey, refCode }) {
  const product = PRODUCTS.desipper;
  const refLink = `https://carbonatedaudio.com/.netlify/functions/referral?action=track&ref=${refCode}`;
  const licenseSection = licenseKey
    ? `
              <h2 style="color:#ffffff;font-size:18px;margin:0 0 12px;text-align:center;">Your License Key</h2>
              <div style="background:#0d0a1a;padding:16px;border-radius:8px;border:1px solid #2a2440;text-align:center;margin-bottom:8px;">
                <code style="font-size:13px;color:#00d4ff;letter-spacing:0.5px;word-break:break-all;font-family:'Courier New',Courier,monospace;">${licenseKey}</code>
              </div>
              <p style="color:#a09bb5;font-size:13px;text-align:center;margin:0 0 32px;">
                Paste this key into the De-Sipper plugin to activate it.<br>Each key works on up to 3 machines.
              </p>
    `
    : "";

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

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:24px;">
              <div style="width:60px;height:60px;border-radius:50%;background-color:rgba(0,212,255,0.15);border:2px solid #00d4ff;line-height:60px;text-align:center;font-size:28px;">&#10003;</div>
            </td></tr>
          </table>

          <h1 style="color:#ffffff;font-size:24px;text-align:center;margin:0 0 8px;">Thank you for your purchase!</h1>
          <p style="color:#a09bb5;font-size:16px;text-align:center;margin:0 0 32px;">Your De-Sipper v${product.version} download links are below.</p>

          ${licenseSection}

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td align="center" style="padding-bottom:12px;">
              <a href="${product.downloads.mac}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00d4ff,#0066ff);color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">
                Download for macOS
              </a>
            </td></tr>
            <tr><td align="center">
              <a href="${product.downloads.windows}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00d4ff,#0066ff);color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">
                Download for Windows (.exe)
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #2a2440;margin:0 0 24px;">

          <h2 style="color:#ffffff;font-size:16px;margin:0 0 16px;">Order Details</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <tr>
              <td style="color:#a09bb5;padding:4px 0;">Product</td>
              <td style="color:#ffffff;text-align:right;padding:4px 0;">De-Sipper v${product.version}</td>
            </tr>
            <tr>
              <td style="color:#a09bb5;padding:4px 0;">Amount</td>
              <td style="color:#ffffff;text-align:right;padding:4px 0;">${amountPaid}</td>
            </tr>
            <tr>
              <td style="color:#a09bb5;padding:4px 0;">Email</td>
              <td style="color:#ffffff;text-align:right;padding:4px 0;">${email}</td>
            </tr>
            <tr>
              <td style="color:#a09bb5;padding:4px 0;">Order ID</td>
              <td style="color:#ffffff;text-align:right;padding:4px 0;font-size:11px;word-break:break-all;">${orderId}</td>
            </tr>
          </table>

          <hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">

          <h2 style="color:#ffffff;font-size:16px;margin:0 0 12px;">Quick Start</h2>
          <ol style="color:#a09bb5;font-size:14px;padding-left:20px;margin:0;">
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">macOS:</strong> Open the .pkg installer and choose your formats (VST3, AU, AAX, Standalone).</li>
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Windows:</strong> Run the installer — it places the VST3 in the standard plugin folder automatically.</li>
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Activate:</strong> Open De-Sipper in your DAW, paste your license key, and click Activate.</li>
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Rescan plugins</strong> in your DAW, then insert De-Sipper on a vocal track.</li>
          </ol>

          <hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">
          <h2 style="color:#ffffff;font-size:16px;margin:0 0 12px;">Share De-Sipper, earn credit</h2>
          <p style="color:#a09bb5;font-size:14px;line-height:1.6;margin:0 0 16px;">
            Know a producer who'd love De-Sipper? Share your referral link. When someone buys through it, you'll get a free copy of our next plugin.
          </p>
          <div style="background:#0d0a1a;padding:12px 16px;border-radius:8px;border:1px solid #2a2440;text-align:center;margin-bottom:8px;">
            <a href="${refLink}" style="color:#00d4ff;font-size:13px;word-break:break-all;text-decoration:none;">${refLink}</a>
          </div>

        </td></tr>

        <tr><td align="center" style="padding-top:32px;">
          <p style="color:#6b6580;font-size:12px;margin:0;">Need help? Reply to this email or contact mixedbysoda@gmail.com</p>
          <p style="color:#6b6580;font-size:12px;margin:8px 0 0;">&copy; ${new Date().getFullYear()} Carbonated Audio</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildBundleEmail({ email, amountPaid, orderId, carbonatorKey, desipperKey, refCode }) {
  const carbonator = PRODUCTS.carbonator;
  const desipper = PRODUCTS.desipper;
  const refLink = `https://carbonatedaudio.com/.netlify/functions/referral?action=track&ref=${refCode}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0a1a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0a1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:28px;font-weight:800;color:#ffffff;">Carbonated Audio</span>
        </td></tr>
        <tr><td style="background-color:#1a1430;border-radius:16px;padding:40px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:24px;">
              <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,rgba(255,107,43,0.2),rgba(0,212,255,0.2));border:2px solid #cc33ff;line-height:60px;text-align:center;font-size:28px;">&#10003;</div>
            </td></tr>
          </table>
          <h1 style="color:#ffffff;font-size:24px;text-align:center;margin:0 0 8px;">Thank you for the Bundle!</h1>
          <p style="color:#a09bb5;font-size:16px;text-align:center;margin:0 0 32px;">You now own both Carbonator and De-Sipper. Here are your license keys and download links.</p>

          <h2 style="color:#ff6b2b;font-size:18px;margin:0 0 12px;text-align:center;">Carbonator License Key</h2>
          <div style="background:#0d0a1a;padding:16px;border-radius:8px;border:1px solid #2a2440;text-align:center;margin-bottom:8px;">
            <code style="font-size:13px;color:#ff8c42;letter-spacing:0.5px;word-break:break-all;font-family:'Courier New',Courier,monospace;">${carbonatorKey || "Contact support"}</code>
          </div>
          <p style="color:#a09bb5;font-size:13px;text-align:center;margin:0 0 16px;">Paste into the Carbonator plugin to activate. Up to 3 machines.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center" style="padding-bottom:8px;">
              <a href="${carbonator.downloads.mac}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#ff6b2b,#ff8c42);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Carbonator macOS (.pkg)</a>
            </td></tr>
            <tr><td align="center">
              <a href="${carbonator.downloads.windows}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#ff6b2b,#ff8c42);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Carbonator Windows (.zip)</a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #2a2440;margin:0 0 24px;">

          <h2 style="color:#00d4ff;font-size:18px;margin:0 0 12px;text-align:center;">De-Sipper License Key</h2>
          <div style="background:#0d0a1a;padding:16px;border-radius:8px;border:1px solid #2a2440;text-align:center;margin-bottom:8px;">
            <code style="font-size:13px;color:#00d4ff;letter-spacing:0.5px;word-break:break-all;font-family:'Courier New',Courier,monospace;">${desipperKey || "Contact support"}</code>
          </div>
          <p style="color:#a09bb5;font-size:13px;text-align:center;margin:0 0 16px;">Paste into the De-Sipper plugin to activate. Up to 3 machines.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center" style="padding-bottom:8px;">
              <a href="${desipper.downloads.mac}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#00d4ff,#0066ff);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">De-Sipper macOS (.pkg)</a>
            </td></tr>
            <tr><td align="center">
              <a href="${desipper.downloads.windows}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#00d4ff,#0066ff);color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">De-Sipper Windows (.exe)</a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #2a2440;margin:0 0 24px;">
          <h2 style="color:#ffffff;font-size:16px;margin:0 0 16px;">Order Details</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <tr><td style="color:#a09bb5;padding:4px 0;">Product</td><td style="color:#ffffff;text-align:right;padding:4px 0;">Carbonated Audio Bundle</td></tr>
            <tr><td style="color:#a09bb5;padding:4px 0;">Includes</td><td style="color:#ffffff;text-align:right;padding:4px 0;">Carbonator v${carbonator.version} + De-Sipper v${desipper.version}</td></tr>
            <tr><td style="color:#a09bb5;padding:4px 0;">Amount</td><td style="color:#ffffff;text-align:right;padding:4px 0;">${amountPaid}</td></tr>
            <tr><td style="color:#a09bb5;padding:4px 0;">Email</td><td style="color:#ffffff;text-align:right;padding:4px 0;">${email}</td></tr>
            <tr><td style="color:#a09bb5;padding:4px 0;">Order ID</td><td style="color:#ffffff;text-align:right;padding:4px 0;font-size:11px;word-break:break-all;">${orderId}</td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">
          <h2 style="color:#ffffff;font-size:16px;margin:0 0 12px;">Quick Start</h2>
          <ol style="color:#a09bb5;font-size:14px;padding-left:20px;margin:0;">
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Install both plugins</strong> using the download links above.</li>
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Activate each plugin</strong> with its respective license key.</li>
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Rescan plugins</strong> in your DAW.</li>
            <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Try Carbonator</strong> on a bus for saturation, and <strong style="color:#ffffff;">De-Sipper</strong> on vocals for de-essing.</li>
          </ol>

          <hr style="border:none;border-top:1px solid #2a2440;margin:24px 0;">
          <h2 style="color:#ffffff;font-size:16px;margin:0 0 12px;">Share the love</h2>
          <p style="color:#a09bb5;font-size:14px;line-height:1.6;margin:0 0 16px;">Know a producer who'd love these? Share your referral link.</p>
          <div style="background:#0d0a1a;padding:12px 16px;border-radius:8px;border:1px solid #2a2440;text-align:center;">
            <a href="${refLink}" style="color:#cc33ff;font-size:13px;word-break:break-all;text-decoration:none;">${refLink}</a>
          </div>
        </td></tr>

        <tr><td align="center" style="padding-top:32px;">
          <p style="color:#6b6580;font-size:12px;margin:0;">Need help? Reply to this email or contact mixedbysoda@gmail.com</p>
          <p style="color:#6b6580;font-size:12px;margin:8px 0 0;">&copy; ${new Date().getFullYear()} Carbonated Audio</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
