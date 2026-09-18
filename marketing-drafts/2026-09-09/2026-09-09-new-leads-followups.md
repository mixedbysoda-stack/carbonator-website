# New leads since last run - 2026-09-09
Window: leads with timestamp > 2026-09-08T16:15:00Z (the 09-08 run's write time)
Count: 3. That is the real number. No padding.

APD: no bundle price, no discount, no promo code, no bundle link in any draft below.
Individual regular prices are quoted where relevant - a regular price is not a discount, and the
live site shows the same number during the window.

---

## THE IMPORTANT NUANCE ON THE TWO STILL LEADS

Both Still leads captured in the last 24h. `DOWNLOAD_GRANT_TTL_MS` is 48h in `capture-lead.js`,
so **their tokens are still alive**, unlike the 160-lead pending backlog:

| Lead | Captured | Token dies | Status now |
|---|---|---|---|
| joesc25@gmail.com | 2026-09-08T20:15:03Z | **2026-09-10T20:15Z** | ~36h left at time of writing |
| dietzmix@hotmail.com | 2026-09-09T08:32:09Z | **2026-09-11T08:32Z** | ~48h left |

This is the only cohort in the entire database where a "your link is still good, go use it" nudge is
honest. For everyone older than 48h that sentence is a lie and the 410 page proves it.

**Send these two TODAY or the window closes and they fall into the dead-token backlog.**
That is a recurring, automatable failure: nothing currently emails a Still lead between the welcome
and the token expiring. See the standing recommendation at the bottom of this file.

Both arrived from `https://www.kvraudio.com`, `utm_campaign=still_launch`. KVR is still converting
on the Still launch listing.

---

## DRAFT 1 - joesc25@gmail.com

TO: joesc25@gmail.com
SUBJECT: Your Still download link expires tomorrow

BODY:

Hey,

You grabbed Still off the KVR listing yesterday. Quick heads up rather than a sales email: the
download link in that first message is only good for 48 hours, so yours lapses tomorrow evening.

If you have not pulled it down yet: https://carbonatedaudio.com/still

No form, no account, ten seconds, and it mints you a fresh link.

One setting tip that saves people the most time. Set the dial during a silence, not during the
performance. Find a stretch with only room tone, push it until the noise floor drops out, then back
off a hair. That setting will hold for the whole take. Still is built for constant noise - preamp
hiss, a fan, air conditioning, room tone - so it is not the tool for a one-off door slam.

Zero latency, so you can track through it.

macOS only right now. Windows is in progress.

If it does something wrong in a real session I would rather hear it than not.

- Soda
Carbonated Audio

---

## DRAFT 2 - dietzmix@hotmail.com

TO: dietzmix@hotmail.com
SUBJECT: Still - one setting tip

BODY:

Hey,

Thanks for grabbing Still this morning off KVR. Two useful things, then I will leave you alone.

First, the download link in your welcome email expires in 48 hours. If you have not installed it
yet, https://carbonatedaudio.com/still gives you a fresh one instantly - no form, no account.

Second, the tip that gets people to a good result fastest: set the dial during a silence, not during
the take. Find a passage that is only room tone, bring it up until the noise floor drops, then ease
back slightly. That setting holds across the whole track. Still targets constant noise - hiss, hum,
fans, AC - so intermittent noises still need editing by hand.

Zero latency, fine to leave in place while tracking. Hit the delta button to solo exactly what is
being removed; it is the fastest way to hear whether you have gone too far.

macOS only for now, VST3 / AU / AAX, signed and notarised. Windows is in progress.

Real-session feedback, including the bad kind, is genuinely useful.

- Soda
Carbonated Audio

---

## DRAFT 3 - rrrgggnnn@gmail.com (On Tap demo)

Captured 2026-09-09T03:57:23Z via `ontap-demo-gate`. `verification_status=not_required`,
`drip_status=email1_sent` - the automated email 1 already went out at 03:57:27. **This is a
second touch, so do not repeat the welcome copy.** No referrer and no landing page recorded, so
platform is unknown - the draft below does not assume Mac or Windows.

Verified against `ontap.html` today, so this is current and not from memory:
- price **$20**
- "Windows demo build is available now - paid Windows version is coming soon"

That last point is the one thing that can waste this person's time, so it leads.

TO: rrrgggnnn@gmail.com
SUBJECT: On Tap demo - the one thing to check first

BODY:

Hey,

You pulled the On Tap demo overnight. One thing worth knowing up front, because it decides whether
the demo is even worth your time: the Windows build is **demo only** at the moment. The paid Windows
version is coming, but it is not out. On macOS the paid version is available now. If you are on
Windows, try it by all means, just know that today it is a preview rather than something you can buy.

The part of On Tap most worth testing in the demo, since it is the thing other duckers do not do:
band-split ducking. You can duck only the low end and leave the highs untouched, so the kick clears
space in the sub without the whole mix pumping. Set the split around 150-200 Hz, duck below it only,
and A/B against full-band. On a busy mix it is usually obvious immediately.

The curve editor is the other one. Tempo-synced, and you can draw the release shape by hand rather
than picking from a menu.

On Tap is $20 if it earns a slot.

https://carbonatedaudio.com/ontap

If something is broken or a curve behaves oddly, tell me - that is the useful kind of reply.

- Soda
Carbonated Audio

---

## SENDING NOTES
- Send all three from hello@carbonatedaudio.com via Resend.
- The two Still drafts are time-critical. Sending them Sep 11 or later makes both of them wrong.
- No suppression-list conflicts checked - `email-suppression.txt` is in the repo root, verify before
  send. None of these three addresses is a `mixedbysoda+*` internal test row.

## STANDING RECOMMENDATION (this is the third run to surface it)
403 of 562 leads came through `still-download`, and 160 sit at `verification_status=pending`. The
mechanism is not apathy, it is a 48h TTL with **no reminder before it lapses**. One scheduled job
that emails any unverified Still lead at roughly the 24h mark, with a link back to `/still` rather
than to the dead token, would prevent nearly this entire backlog from re-forming. It costs one
Netlify scheduled function. Everything else in this folder is cleanup after the fact.
