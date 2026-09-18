// Daily creator video watcher (schedule lives in netlify.toml next to the
// drips). Emails SODA when a signed creator posts a YouTube video that
// mentions Carbonated Audio, a plugin or their own code. Silent on days with
// nothing new. The logic is in lib/creator-videos.js.
//
// Manual run: Netlify > Logs > Functions > creator-video-watch > Run now
// (scheduled functions cannot be called by URL). Env: RESEND_API_KEY and
// STRIPE_SECRET_KEY, both already set for other functions. Optional:
// YOUTUBE_API_KEY, a YouTube Data API v3 key, which makes the watcher
// independent of YouTube's page HTML.
const Stripe = require("stripe");
const { Resend } = require("resend");
const { sendEmail } = require("./lib/mailer");
const { escapeHtml } = require("./lib/escape");
const W = require("./lib/creator-videos");

const FROM_EMAIL = "Carbonated Audio <hello@carbonatedaudio.com>";
const OWNER_EMAIL = "mixedbysoda@gmail.com";

exports.handler = async () => {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  try {
    const summary = await W.runWatch({
      // stripe-node waits 80 s per request by default; this function has 30 s in total.
      stripe: process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 5000, maxNetworkRetries: 1 }) : null,
      apiKey: String(process.env.YOUTUBE_API_KEY || "").trim(),
      // Netlify stops scheduled functions at 30 s. Stop starting new work well before.
      deadlineMs: 24000,
      notify: resend
        ? async (payload) => {
            const mail = W.buildOwnerEmail(payload);
            await sendEmail(resend, { from: FROM_EMAIL, to: OWNER_EMAIL, subject: mail.subject, html: mail.html, text: mail.text });
          }
        : null,
    });
    console.log("creator-video-watch:", JSON.stringify(summary));
    return { statusCode: 200, body: JSON.stringify(summary) };
  } catch (err) {
    // Blobs unreadable, or a bug. There is no state to dedupe alerts with, so
    // this repeats every run until it is fixed, which is the point.
    const message = err && err.message ? err.message : String(err);
    console.error("creator-video-watch crashed:", err && err.stack ? err.stack : err);
    if (resend) {
      await sendEmail(resend, {
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: "Creator video watcher crashed",
        html: `<div style="font-family:Arial,sans-serif;padding:20px;background:#0d0a1a;color:#fff;">
          <h2 style="color:#ff6b2b;">Creator video watcher crashed</h2>
          <p>${escapeHtml(message)}</p>
          <p style="color:#6b6580;font-size:12px;">No creator videos were checked this run. The stack trace is in the Netlify function log for creator-video-watch.</p>
        </div>`,
        text: `Creator video watcher crashed: ${message}\nNo creator videos were checked this run. The stack trace is in the Netlify function log for creator-video-watch.`,
      }).catch((mailErr) => console.error("creator-video-watch: crash email failed:", mailErr.message));
    }
    return { statusCode: 500, body: "crashed" };
  }
};
