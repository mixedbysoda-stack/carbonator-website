// Drip Email 3 — Day 7 conversion push
// Trigger: run via scheduled cron or manual invoke
// Finds leads where email2 was sent 4+ days ago (7 days from signup) but no email3 yet

const { getBlobStore } = require("./lib/store");
const { Resend } = require("resend");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const BUY_URL = "https://buy.stripe.com/aFafZhgbffRw6nv0UH3oA00";

exports.handler = async () => {
  if (!process.env.RESEND_API_KEY) {
    return { statusCode: 200, body: "No RESEND_API_KEY — skipping" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const store = getBlobStore("leads");
  const { blobs } = await store.list();

  const now = Date.now();
  const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;
  let sent = 0;

  for (const blob of blobs) {
    try {
      const lead = await store.get(blob.key, { type: "json" });
      if (!lead || !lead.contact) continue;
      if (lead.drip_status !== "email2_sent") continue;
      if (!lead.email2_sent_at) continue;

      const elapsed = now - new Date(lead.email2_sent_at).getTime();
      if (elapsed < FOUR_DAYS) continue;

      // Send Day 7 email
      await resend.emails.send({
        from: FROM_EMAIL,
        to: lead.contact,
        subject: "Ready to go full version? $20, no subscription.",
        html: buildDay7Email(lead.contact),
      });

      // Update status
      lead.drip_status = "email3_sent";
      lead.email3_sent_at = new Date().toISOString();
      await store.setJSON(blob.key, lead);

      sent++;
      console.log(`Day 7 email sent to ${lead.contact}`);
    } catch (err) {
      console.error(`Day 7 email failed for ${blob.key}:`, err.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ sent }),
  };
};

function buildDay7Email(email) {
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

          <h1 style="color:#ffffff;font-size:22px;margin:0 0 16px;">Tired of the 60-second demo limit?</h1>

          <p style="color:#a09bb5;font-size:15px;line-height:1.7;margin:0 0 20px;">
            If you've been using the Carbonator demo, you've probably hit that mute cycle a few times by now. The full version removes it completely — unlimited rendering, no interruptions, ever.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="background:#0d0a1a;border-radius:10px;padding:20px;border:1px solid #2a2440;">
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#a09bb5;">
                <tr>
                  <td style="padding:6px 0;"><span style="color:#10b981;">✓</span> All 5 flavors + Carbonated mode</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;"><span style="color:#10b981;">✓</span> Unlimited offline rendering</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;"><span style="color:#10b981;">✓</span> Use on up to 3 machines</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;"><span style="color:#10b981;">✓</span> Free updates for life</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;"><span style="color:#10b981;">✓</span> No subscription — pay once, own forever</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="background:#0d0a1a;border-radius:10px;padding:16px 20px;border:1px solid #2a2440;">
              <p style="color:#ffffff;font-size:14px;font-style:italic;line-height:1.6;margin:0 0 8px;">
                "I've tried saturation plugins 3x the price that don't sound this good."
              </p>
              <p style="color:#6b6580;font-size:13px;margin:0;">— Featured on Audio Plugin Guy &amp; Rekkerd.org</p>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr><td align="center">
              <a href="${BUY_URL}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#ff6b2b,#ff3366);color:#ffffff;text-decoration:none;border-radius:8px;font-size:18px;font-weight:700;">
                Get Carbonator — $20
              </a>
            </td></tr>
          </table>

          <p style="color:#6b6580;font-size:13px;text-align:center;margin:0;">
            Launch price — goes up to $35 after April 30.
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
