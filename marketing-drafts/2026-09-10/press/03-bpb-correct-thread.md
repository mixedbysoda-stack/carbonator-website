# BPB - re-open the demo video thread (CORRECT THREAD)

**Status:** Gmail draft created 2026-09-10, draft id `r8514832540276488998`.
**Thread:** `19fca48a5bd1fb3f` (reply to message `19fd5a94369fb906`, Tomislav's "Sure, please do!" of 2026-08-06)
**To:** tomislav@bedroomproducersblog.com

## Why this file exists

An earlier draft this run went into thread `1a02ae5a80eaf57e`, which is the **TALLBOY** pitch of 2026-08-22.
That is a different conversation. The demo-video debt lives in `19fca48a5bd1fb3f`, which is **in Trash**,
which is why a default Gmail search does not return it and why it briefly looked like the thread was invented.
Search with `in:anywhere` to see it.

## Verified thread history

- 2026-08-04 08:00Z, Soda: "Free plugin for BPB - Still, a one-dial noise suppressor (plus FIZZFUEL)"
- 2026-08-05 06:00Z, Tomislav: "definitely something we could feature. Is there a demo video for the freebie?"
- 2026-08-05 08:54Z, Soda: "I am currently working on the video and should have it uploaded to the site shortly."
- 2026-08-06 06:00Z, Tomislav: "Sure, please do!"

Day 35 of silence as of today. Note Soda claimed the video was already in progress, so the re-open has to
address that specific claim and not just the gap.

## Compliance check

- APD exclusivity window active to 2026-09-14T23:59:59Z. Draft contains no price, no discount, no code,
  no bundle link. Still is free, so the pitch is APD-safe by construction.
- No fix date promised for the group-delay bug, per the architectural reality (8-band zero-latency
  Linkwitz-Riley tree, all-pass in phase; repo last pushed 2026-07-14, zero commits since).
- macOS-only disclosure included.
- ASCII clean, no em-dashes, no smart quotes, no emoji.

## Body as drafted

Hi Tomislav,

I owe you an update and an apology. I told you on August 5th that a demo video was close, and then went quiet
for a month. That was not fair to you, so here is the honest position.

The video is not done. The reason it stalled is that a user reported a real bug in Still shortly after I wrote
to you: on low frequency content the multiband engine introduces audible group delay. It is not a cosmetic
issue. Still splits the signal into eight bands with a zero latency Linkwitz-Riley tree, and that topology
sums flat in level but not in phase, so the low end smears. Fixing it properly means reworking the band
splitting rather than patching a parameter, and I am not going to give you a date I cannot keep.

So I did not want to hand you a demo video for a build I know has a flaw in it, and I did not want to pitch
you again as if nothing had happened.

Two options, whichever suits you:

1. Hold the feature until the phase work lands. I will come back to you with the fixed build and a video, and
   you will be the first to get it.
2. Run it now as is. Still is genuinely free, no email wall on the download for reviewers, and for the
   dialogue and general noise cleanup it was built for it does the job well. If you go this route I would ask
   you to mention that it is macOS only for now, and I would rather you knew about the low end behaviour up
   front than found it yourself.

Either is fine by me. I would just rather you had the full picture than a polished pitch.

Thanks for the patience, and sorry again for the silence.

Soda
Carbonated Audio

## Open question for Soda

Who or what moved this thread to Trash? If a filter or cleanup script is binning inbound press replies, that
is a larger problem than this one draft.
