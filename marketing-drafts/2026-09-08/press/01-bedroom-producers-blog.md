# BEDROOM PRODUCERS BLOG - Tomislav Zlatic - OFFLINE RE-CONTACT - DAY 33

**BLIND-SEND RISK: I did not read this thread today. Gmail is offline. Last time it was actually
read was 2026-08-08. If Tomislav has written again since, this copy still reads fine - it does not
claim he went silent, it apologises for MY silence, which is a fact I can verify from the calendar
rather than the inbox.**

Contact: tomislav@bedroomproducersblog.com. Thread `19fca48a5bd1fb3f`.
Not on the named outlet list for this run. Included because it is the warmest lead in the pipeline
and the only genuine inbound reply on record.

## STATE
- 2026-08-05 Tomislav: Still is "definitely something we could feature", asked for a demo video.
- 2026-08-06 Soda promised one. Tomislav: "Sure, please do!"
- **33 days later the video does not exist and the ball has never left Soda's court.**
- Seven consecutive runs staged copy gated on that video. Zero of it sent. That is the failure, and
  it has never once been a copy failure - sendable copy has existed since 08-30.

## THE DECISION SODA HAS TO MAKE TODAY
Two variants have been sitting staged since 09-06:
- **(B)** re-open with no promise attached. Invites him to publish now, against the open bug.
- **(C)** re-open that says an audio fix is landing and asks him to time the post to it.

09-06 and 09-07 both recommended (C), conditional on Soda actually committing to ship the fix.

**That condition failed today, and now it is measured, not assumed.** I queried the Still repo
directly: last commit **2026-07-14**, zero commits in 56 days, one branch, zero PRs, no CI. And the
artifact is architectural - Still is an 8-band Linkwitz-Riley tree, which is all-pass in phase by
construction, so low-frequency group delay is a property of the design and not a quick patch.

**RECOMMENDATION: SEND VARIANT (B) TODAY.**
(C) would put a delivery promise in writing to the biggest free-plugin outlet in the space, backed
by zero commits, on a fix that is a re-architecture rather than a one-liner. Missing that promise
costs more than the honest version does. (B) plus the caveat line below gets 90 percent of (C)'s
protection with none of the exposure.

**The decision is Soda's and it is binary:** either start the fix today and (C) becomes honest, or
send (B). A 34th day of silence on a yes he already gave is still the only clearly wrong answer.

## VERSION-NUMBER WARNING - ACT ON THIS BEFORE THE NEXT RELEASE
The Windows release plan reserves **v1.0.2 for Windows packaging**, explicitly "not a change to
Still's DSP." If Windows ships as v1.0.2, every future run will read the version bump as the fix
landing. Ship **Windows as v1.1.0** and keep **v1.0.2 for the phase fix**, with a changelog line
that names the low-frequency behaviour.

---

## VARIANT (B) - SEND TODAY

TO: tomislav@bedroomproducersblog.com
SUBJECT: Re: Still - demo video

Hey Tomislav,

Straight with you: the demo video I promised a month ago still is not done, and I have decided that
is a bad reason to keep sitting on your calendar without a word.

Still is live and free right now, and it stays free. No account, no trial, no email wall. One dial,
adaptive, zero latency, and a delta button that solos exactly what is being removed. macOS, signed
and notarised, VST3 / AU / AAX. Windows is still in progress.

https://carbonatedaudio.com/still

One thing worth knowing before you spend time on it: a user running it in Acoustica flagged a
low-frequency timing artifact. I am not going to pretend I have a date for that, because I do not.
I would rather you heard it from me than found it mid-write-up.

So: run it whenever suits you and do not wait on me. If you would rather have the video first, say
so and it becomes the next thing I ship. And if you would sooner grab your own capture, that is
completely fine.

Sorry for the month.

- Soda
Carbonated Audio

---

## IF SODA STARTS THE FIX TODAY, SEND THIS INSTEAD (variant C)

TO: tomislav@bedroomproducersblog.com
SUBJECT: Re: Still - demo video

Hey Tomislav,

Straight with you: the demo video I promised a month ago is not done, and I have decided that is a
bad reason to keep sitting on your calendar without a word.

Where Still actually is. It is live and free right now, and it stays free - no account, no trial,
no email wall. One dial, adaptive, zero latency, and a delta button that solos exactly what is being
removed. macOS, signed and notarised, VST3 / AU / AAX. Windows in progress.

https://carbonatedaudio.com/still

One honest note before you spend any time on it. A user running it in Acoustica found a
low-frequency timing artifact, and the fix is what I am on now. I would rather tell you that than
have you find it mid-write-up. So my ask is not "publish this week" - it is: let me send you one
line the day the patched build is up, and you decide then. The video comes with it.

Grab it now if you want to poke at it in the meantime, and if you would sooner shoot your own
capture than wait for mine, that is completely fine too.

Sorry for the month of silence.

- Soda
Carbonated Audio

## NOTE ON THE 2026-03-22 "PAID ONLY" ENTRY IN THE STATUS FILE
That entry says BPB covers commercial products only, via a $250 sponsored post. Not in conflict:
Still is FREE, and free plugins are exactly the lane BPB covers organically. No payment involved.

## DO NOT INCLUDE
No bundle price, no discount, no promo code. APD exclusivity window runs through Sep 14.
