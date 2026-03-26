// Drip Email 2 — Day 3 nudge
// Trigger: run via scheduled cron or manual invoke
// Finds leads where email1 was sent 3+ days ago but no email2 yet

const { getStore } = require("@netlify/blobs");
const { Resend } = require("resend");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";

exports.handler = async () => {
  if (!process.env.RESEND_API_KEY) {
    return { statusCode: 200, body: "No RESEND_API_KEY — skipping" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const store = getStore("leads");
  const { blobs } = await store.list();

  const now = Date.now();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  let sent = 0;

  for (const blob of blobs) {
    try {
      const lead = await store.get(blob.key, { type: "json" });
      if (!lead || !lead.contact) continue;
      if (lead.drip_status !== "email1_sent") continue;
      if (!lead.email1_sent_at) continue;

      const elapsed = now - new Date(lead.email1_sent_at).getTime();
      if (elapsed < THREE_DAYS) continue;

      // Send Day 3 email
      await resend.emails.send({
        from: FROM_EMAIL,
        to: lead.contact,
        subject: "How's the Carbonator demo treating you?",
        html: buildDay3Email(lead.contact),
      });

      // Update status
      lead.drip_status = "email2_sent";
      lead.email2_sent_at = new Date().toISOString();
      await store.setJSON(blob.key, lead);

      sent++;
      console.log(`Day 3 email sent to ${lead.contact}`);
    } catch (err) {
      console.error(`Day 3 email failed for ${blob.key}:`, err.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ sent }),
  };
};

function buildDay3Email(email) {
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

          <h1 style="color:#ffffff;font-size:22px;margin:0 0 16px;">How's the demo going?</h1>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 20px;">
            Just checking in — have you had a chance to try Carbonator yet?
          </p>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 20px;">
            Here's what producers are loving most:
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="background:#0d0a1a;border-radius:10px;padding:20px;border:1px solid #2a2440;">
              <p style="color:#ffffff;font-size:14px;line-height:1.7;margin:0 0 12px;">
                <strong style="color:#ff6b2b;">🥤 Cola on drums</strong> — "Instant warmth without the mud. This is my go-to now."
              </p>
              <p style="color:#ffffff;font-size:14px;line-height:1.7;margin:0 0 12px;">
                <strong style="color:#cc33ff;">🍇 Grape on vocals</strong> — "That lo-fi character I used to spend forever trying to recreate."
              </p>
              <p style="color:#ffffff;font-size:14px;line-height:1.7;margin:0;">
                <strong style="color:#ffd700;">🍋 Lemon-Lime on hi-hats</strong> — "Adds air and sparkle without harshness."
              </p>
            </td></tr>
          </table>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 24px;">
            Haven't installed it yet? No worries — here's your download link again:
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="https://carbonatedaudio.com/Carbonator%20DEMO.zip" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#ff6b2b,#ff8c42);color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">
                Download Carbonator Demo
              </a>
            </td></tr>
          </table>

          <p style="color:#6b6580;font-size:13px;text-align:center;margin:0;">
            Questions? Just reply — I read every email.
          </p>

        </td></tr>

        <tr><td align="center" style="padding-top:32px;">
          <p style="color:#6b6580;font-size:12px;margin:0;">
            &copy; ${new Date().getFullYear()} Carbonated Audio &middot; <a href="https://carbonatedaudio.com" style="color:#6b6580;">carbonatedaudio.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
