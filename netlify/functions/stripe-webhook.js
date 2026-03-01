const Stripe = require("stripe");
const { Resend } = require("resend");
const { VERSION, DOWNLOAD_URLS } = require("./config");

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

    const amountPaid = session.amount_total
      ? `$${(session.amount_total / 100).toFixed(2)}`
      : "$20.00";
    const orderId = session.id;

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: "Carbinated Audio <onboarding@resend.dev>",
        to: email,
        subject: "Your Carbonator Download Links",
        html: buildEmail({ email, amountPaid, orderId }),
      });

      console.log(`Delivery email sent to ${email}`);
    } catch (err) {
      console.error("Failed to send delivery email:", err.message);
      // Don't return 500 — Stripe would retry the webhook
      return { statusCode: 200, body: "Email send failed" };
    }
  }

  return { statusCode: 200, body: "OK" };
};

function buildEmail({ email, amountPaid, orderId }) {
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
              <span style="font-size:28px;font-weight:800;color:#ffffff;">Carbinated Audio</span>
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
                <li style="margin-bottom:8px;"><strong style="color:#ffffff;">Rescan plugins</strong> in your DAW, then drop Carbonator on a track.</li>
              </ol>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="color:#6b6580;font-size:12px;margin:0;">
                Need help? Reply to this email or contact support@carbinatedaudio.com
              </p>
              <p style="color:#6b6580;font-size:12px;margin:8px 0 0;">
                &copy; ${new Date().getFullYear()} Carbinated Audio
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
