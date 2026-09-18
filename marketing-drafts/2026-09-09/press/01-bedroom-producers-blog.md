# BEDROOM PRODUCERS BLOG - Tomislav Zlatic - OFFLINE RE-CONTACT - DAY 34

**BLIND-SEND RISK: I did not read this thread today. Gmail is offline. It was last genuinely read on
2026-08-08. If Tomislav has written again since, this copy still reads fine - it does not claim he
went silent, it apologises for MY silence, which is verifiable from a calendar rather than an inbox.**

Contact: tomislav@bedroomproducersblog.com. Thread `19fca48a5bd1fb3f`.

## STATE
- 2026-08-05 Tomislav: Still is "definitely something we could feature", asked for a demo video.
- 2026-08-06 Soda promised one. Tomislav: "Sure, please do!"
- **Today is day 34.** The video does not exist. The ball has never left Soda's court.
- Eight consecutive runs have staged copy gated on that video. Zero of it sent. Sendable copy has
  existed since 08-30, so this has never once been a copy problem.

## THE GATING CONDITION, RE-MEASURED TODAY (not carried over on trust)
Queried `mixedbysoda-stack/still` via the GitHub API this session:
    2026-07-14T21:02:03Z  7a7ebd5  test: real-plugin host harness (still_hostcheck)
    2026-07-14T20:41:10Z  439c25c  fix: field bugs from v1.0.0 (v1.0.1)
    2026-07-08T22:48:37Z  dc93300  build: staged signing scripts used for v1.0.0 ship
**Last commit 2026-07-14. Fifty-seven days. Nothing since.**

So variant (C) - the one that tells Tomislav a fix is landing and asks him to time the post to it -
still has zero commits behind it. It stays **DISQUALIFIED**. The condition the 09-06 file set has now
failed on four consecutive days of measurement.

Second, independent reason: the artifact is architectural. Still is an 8-band Linkwitz-Riley splitter,
which sums flat in magnitude but is all-pass in phase, so low-frequency group delay is a property of
the topology rather than a stray defect. That is a phase-compensation pass or a topology change, not
a same-day patch. Do not put a date on it in writing to the biggest free-plugin outlet in the space.

**RECOMMENDATION: SEND VARIANT (B) TODAY. Unchanged from 09-08, and now better evidenced.**
A 34th day of silence on a yes he already gave is the only clearly wrong answer available.

## VERSION-NUMBER WARNING - STILL UNRESOLVED, ACT BEFORE THE NEXT RELEASE
The Windows release plan reserves **v1.0.2 for Windows packaging**, explicitly "not a change to
Still's DSP." If Windows ships as v1.0.2, every future run reads the bump as the fix landing - the
exact trap v1.0.1 set, which took five runs to dig out of. Ship **Windows as v1.1.0** and keep
**v1.0.2 for the phase fix**, with a changelog line naming the low-frequency behaviour.

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

## DO NOT INCLUDE
No bundle price, no discount, no promo code, no bundle link. The APD exclusivity window runs through
2026-09-14T23:59:59Z. Still is free, so this email is APD-safe as written - keep it that way.

## NOTE ON THE 2026-03-22 "PAID ONLY" ENTRY IN THE STATUS FILE
That entry says BPB covers commercial products only, via a $250 sponsored post. Not in conflict:
Still is FREE, and free plugins are exactly the lane BPB covers organically. No payment involved.
