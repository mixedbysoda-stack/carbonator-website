# Pending-Verification Recapture - 148 leads
Date: 2026-09-08
Segment: verification_status=pending, drip_status=unverified
Size: 148 (130 of them 8-30 days old)

## WHY THIS EMAIL EXISTS (read before sending)
These people are NOT ignoring a confirm link. Their confirm link is DEAD.
capture-lead.js sets DOWNLOAD_GRANT_TTL_MS = 48h. verify-still-download.js
returns HTTP 410 "That link has expired" past that. 130 of these leads are
8-30 days old, so every one of those tokens expired weeks ago.

Do NOT send "please confirm your email" copy. The only working unblock is
sending them back to /still to trigger a FRESH token.

APD note: no bundle price, no discount, no bundle checkout link. Compliant.

---
TO: [148-lead pending segment - see /tmp/leads.json filter]
SUBJECT: Your Still link expired - here is a fresh one

BODY:

Hey,

You grabbed Still a little while back and the download link in that first
email has since expired. That is on our side, not yours - the link is only
good for 48 hours and we did not send a reminder before it lapsed.

Fresh copy, no forms, no account:

https://carbonatedaudio.com/still

Takes about ten seconds. Still is free with no time limit, no trial, and
nothing feature-locked.

Quick note on getting the most out of it: Still is built for constant
background noise - room tone, preamp hiss, computer fan, air conditioning.
Set it on a section where the performer is not talking, push the dial until
the noise floor drops, then back off slightly. It is doing the most work on
spoken word and vocal takes.

macOS only right now, VST3 / AU / AAX, signed and notarized. Windows is in
progress and confirming puts you on that list.

Sorry for the dead link.

- Soda
Carbonated Audio

---
## SENDING NOTES
- Suppress the 5 mixedbysoda+* internal test rows before send.
- nerhway8@gmai.com is a typo domain (gmai.com). Will hard bounce. Drop it.
- Recommend sending in 2 batches to watch bounce rate - this cohort has never
  had a confirmed open, so list hygiene is unproven.
