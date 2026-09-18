# Lead analysis - 2026-09-10

## APD compliance statement
Re-checked `components/apd-window.js` directly this session. Window is `2026-08-30T00:00:00Z` to
`2026-09-14T23:59:59Z`. Today, 2026-09-10, is inside it. Nothing below contains a bundle price, a
discount code, "$55", "SAVE $74", a bundle checkout link, or a bundle CTA of any kind. Still is free,
so every draft here is Still-only and fully APD-safe regardless of the window. No draft claims a
price increase date for anything.

## Total vs yesterday
574 leads today vs 562 on 2026-09-09: **+12 net**, but **13 new event rows** landed in the last 30h.
The gap is `veebanno@gmail.com`, who submitted the Still gate twice: 10:42Z (verified at 12:30Z) and
again at 12:33Z (still pending as of the data pull). One person, two rows, +1 lead but +2 events. See
anomaly note below.

## Verification-rate read
Recomputed directly from `/tmp/leads.json`, not carried over from the brief:
- verification_status distribution across all 574: verified 113, pending 166, not_required 9, null
  (pre-verification era) 286.
- 2026-09-10 partial-day rate: 4 of 12 new unique leads verified so far = **33%**. Small sample, will
  keep moving as the day continues.
- Multi-week trend from prior runs (46.5% -> 38.0% -> 28.2%) is still the more meaningful number than
  any single day. Today sits mid-range of the last 10 days (8%, 17%, 33%, 50%, 33%, 67%, 50%, 50%,
  33%), which is itself noisy day to day. No new conclusion to draw from one day's wobble.

## Pending backlog, exact recount (166 total)
Age buckets from `timestamp` to now (using 2026-09-10T12:54Z as "now," the latest event in the pull):
- under 48h (token still alive): **9**
- 2-8 days: 12
- 8-16 days: 60
- 16-30 days: 85
- 30d+: **0**

Correction to the brief's assumption: there is no 30-day-plus tail. The oldest pending lead in the
entire database is `mixedbysoda+stilltest@gmail.com` at 2026-08-18T19:03Z, 22.7 days old today - that
is a self-test row, not a customer, and it is also the ceiling. Still launched around 2026-08-18, so
nothing in the system can be older than about 23 days yet. The backlog is real but it is bounded by
the product's age, not an accumulating multi-month problem.

**Also worth flagging:** 5 of the 166 pending rows are Soda's own `mixedbysoda+*` test addresses from
launch day (2026-08-18), all sitting in the 16-30d bucket. Real pending count is closer to **161**.
None of the 5 are in the under-48h cohort, so they do not affect today's sends, but any future backlog
recapture blast should exclude the `mixedbysoda+` pattern first.

## The Italian cluster
Four of today's 13 events read as Italian by name/phrase, with a fifth plausible:
- `labellezzasalvailmondo8@gmail.com` - "la bellezza salva il mondo" (Dostoevsky, commonly quoted in
  Italian), pending, 3.3h old
- `pieri.federico@ymail.com` - Federico Pieri, pending, 2.0h old
- `daniele.cerchiai@gmail.com` - Italian name, but already **verified** (self-verified at 12:34Z, 14
  minutes after capture) - no nudge needed
- `thespiritolibero62@gmail.com` - "lo spirito libero," already **verified** (self-verified in under
  a minute) - no nudge needed
- `agostinoprovensal@gmail.com` - Agostino is a common Italian first name, pending, 11.8h old.
  Somewhat less certain than the other four but treated as part of the cluster below.

I could not confirm geography from IP or referrer (most show no referrer or a generic one), so this
is a names-based judgment call, not a verified fact. Two of the four confirmed-Italian names already
verified on their own within minutes, unprompted - that is a good sign the funnel itself works fine
for this audience; the follow-up is only for the two (three, including the less-certain one) still
sitting pending.

## The double-submission anomaly: veebanno@gmail.com
Same address hit the Still gate twice, 111 minutes apart (10:42Z and 12:33Z), same IP prefix
(176.201.214.10), no referrer either time. The first one verified normally 108 minutes after capture.
The second was made at 12:33Z, 3 minutes *after* the first one's verification went through at 12:30Z.
Reading the timeline: they verified the first email, then came back and requested Still again anyway,
which reads as either (a) they did not realize the first request already succeeded and downloading
worked, or (b) the confirmation page/email did not clearly tell them "you're done, here's your
installer" and they assumed they needed to resubmit. Worth a look at what the post-verify screen
actually says - if it is not unmistakably "you already have this," people will keep re-entering their
email. Low stakes here (it is a free plugin, no harm done), but it is the same shape of confusion that
would matter more on a paid gate.

## Referrer question: azu-soundworks.net (23) and vi-control.net (15)
Neither has been looked at in any prior run. Pulled every row for both:

**azu-soundworks.net** - 23 leads, all `still-download`, all between 2026-08-24 and 2026-09-01, and
every single one carries `utm_source=kvr&utm_campaign=still_launch` except the most recent
(2026-09-01, no UTM). Contact emails skew heavily Japanese: `.co.jp`, `.plala.or.jp`,
`.biglobe.ne.jp`, and a run of `icloud.com`/`gmail.com` addresses with Japanese-looking local parts.
My read: azu-soundworks.net is a Japanese audio/production site or forum that either mirrored or
linked directly to the same KVR still_launch URL (hence the KVR UTM riding along on a non-KVR
referrer) when covering the Still launch. That is a real, unclaimed press mention worth finding and
crediting - nobody currently at Carbonated Audio has looked at what azu-soundworks.net actually
published. Flagging for manual research; I have no browsing access to confirm the page content this
session.

**vi-control.net** - 15 leads, all `still-download`, 2026-08-28 to 2026-09-03, zero UTM on any of
them, mixed email providers (gmail, icloud, yahoo, proton.me, mail.com, free.fr - a real geographic
spread, not one cluster). vi-control.net is the Vienna Instruments / orchestral-composer forum. No
UTM plus a clean date window strongly suggests an organic forum thread someone started, not a
coordinated placement or anything Carbonated Audio arranged. Also worth a manual look: if there is a
live thread, a founder reply in it (value-first, not a pitch) could extend its life the way the KVR
listing keeps converting weeks later.

Both are flagged as manual research, not something I can resolve from lead data alone.

## Anomaly: andre_montoro@hotmail.com token expires today
Not one of the 13 new events (captured 2026-09-08T15:26Z, just outside the 30h window the brief
defined), but still inside the under-48h pending cohort and the most time-sensitive item in this
whole run: token dies at **2026-09-10T15:26:22Z**, roughly 2.5 hours from this analysis. Included in
the same-day nudge (draft 01) and called out there as send-first.

## Files written
- `00-lead-analysis.md` - this file
- `01-same-day-nudge-under-48h.md` - 5 English-language recipients, live tokens
- `02-yves-vcstudios-personal.md` - 1 personal note, business domain
- `03-italian-cluster-nudge.md` - 3 Italian-language recipients, live tokens

9 people covered across the three sends = the full under-48h-pending cohort, split by language and by
template-vs-personal treatment. No file was written to pad the count.
