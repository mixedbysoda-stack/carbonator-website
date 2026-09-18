# Task 2 - Press / influencer OFFLINE RE-CONTACT DRAFTS - 2026-09-08

## PROVENANCE. READ BEFORE SENDING ANYTHING IN THIS FOLDER.

**Gmail was OFFLINE for this run. I read ZERO threads and created ZERO Gmail drafts.**
Every file here is an OFFLINE RE-CONTACT written blind. Nothing here is "a reply to a thread I
read." For every contact below the honest status is UNKNOWN - not "they did not reply." Each draft
is worded so it does not read as stupid if the recipient already replied and I could not see it.

Cause (isolated 2026-09-02, NOT re-investigated today): the `gmail` MCP server is registered in
`~/.claude.json` only under project scopes `/Users/soda` and `/Users/soda/Desktop/carbonator-website`.
This run's cwd is `/`, so it never loads and no gmail tool exists in the tool list at all.
Dead ends already exhausted and NOT retried: `~/.gmail-mcp/`, `~/.claude/gmail-mcp/credentials.json`,
`~/.gmail-agent/emails.db`, gcloud CLI, the `mcp.google.com` SSE entry (NXDOMAIN).

ONE-LINE FIX (needs an interactive session):
    claude mcp add --scope user --transport http gmail https://gmail.run.tools
then `/mcp` to finish OAuth, then `claude mcp remove gmail -s local` from
`~/Desktop/carbonator-website` to kill the dead SSE entry.

**Drafts were also staged on 08-25, 08-30, 09-01, 09-03, 09-05, 09-06 and 09-07 with UNVERIFIABLE
send status. Check Sent Mail before sending anything here or you may be firing touch 4 or 5.**

---

# WHAT IS NEW TODAY (everything else is carried forward from 09-07)

## 1. THE STILL REPO HAS NOT BEEN TOUCHED IN 56 DAYS. v1.0.2 DOES NOT EXIST IN ANY FORM.
Queried `mixedbysoda-stack/still` directly today via the GitHub API:
- Releases: **v1.0.1 (2026-07-14)** and v1.0.0 only.
- Last commit on `main`: **2026-07-14T21:02:03Z**. Nothing since.
- Branches: `main` only. Open or closed PRs: **zero**. No `.github` directory, so no Windows CI either.

**Consequence: BPB variant (C) is not backed by any work.** (C) tells Tomislav "the fix is what I am
on now." There is not one commit behind that sentence. The 09-06 DECISION file set the rule itself:
send (C) only if a fix is genuinely coming. It is not started.
**=> The recommendation flips to variant (B). See `01-bedroom-producers-blog.md`.**

## 2. VERSION-NUMBER COLLISION. THIS WILL RE-BREAK THE RECORD IF NOT FIXED NOW.
`SODA HQ/Carbonated Audio/Still Windows Release Plan - Aug 2026.md` (audited 2026-08-17) reserves
the tag **v1.0.2 for the Windows VST3 packaging release**, and says in as many words that the JUCE
pin is "a reproducibility fix, **not a change to Still's DSP**."

So if Windows ships as v1.0.2, the site bumps to v1.0.2 with a changelog that says nothing about
phase, and the next six runs conclude "v1.0.2 shipped, the bug must be fixed" - the exact trap
v1.0.1 set and that took five runs to dig out of.

**Do this:** ship Windows as **v1.1.0**, and reserve **v1.0.2 for the group-delay fix**, with a
changelog line that names the low-frequency / phase behaviour explicitly. Whichever way round, the
two must not share a number.

## 3. THE GROUP-DELAY BUG IS ARCHITECTURAL, NOT A STRAY DEFECT.
Still's engine, from its own commit history: "8-band zero-latency **Linkwitz-Riley** splitter with
flat reconstruction" plus "adaptive 8-band downward expansion." An LR crossover tree sums flat in
MAGNITUDE but is **all-pass in phase** - low-frequency group delay is an inherent property of that
topology, not a bug that got in by accident. adamtvmedia (2026-08-04) is most likely hearing the
architecture.
**This is not a same-day patch.** It is either a phase-compensation pass or a topology change.
That is the second, independent reason not to send an email promising an imminent fix.

## 4. MUSICTECH ROUTE RE-VERIFIED LIVE TODAY. THE PRIOR FINDING HOLDS.
Pulled `https://musictech.com/contact/` today: **HTTP 200, and there is no `<form>` element on the
page at all** - no news-tip form, no contact form. The only addresses it publishes are
`editors@`, `letters@`, `advertise@`, `licensing@` (all musictech.com), plus `press@nmenetworks.com`
and `privacy@nmenetworks.com`. The page also still lists the pre-acquisition `editors@musictech.net`.
`editors@` is both the only editorial route and the address that bounces an NME Networks auto-reply.
**There is no email route to fix. Do not send to any @musictech.com or @musictech.net address.**

## 5. APD WINDOW: 6 DAYS LEFT.
`components/apd-window.js` read today: START `2026-08-30T00:00:00Z`, END `2026-09-14T23:59:59Z`.
Inside the window the bundle reads **$129** and the $55 markup is REMOVED from the DOM.
- **No discount copy, no promo code, no bundle price, no bundle link in any press draft this week.**
- Never write "$55" or "SAVE $74". Page source shows both prices because the swap is client-side;
  that is not evidence $55 is live.
- Never paste `8x2cN59MR20GfY5bzl3oA0n` (hidden $129 APD-only variant).
- Never write "price goes up October 1." No such line exists.
- Consequence: the APG **deal** submission (B) is now dead. Window closes Sep 13, and the public APD
  listing URL is still not in the repo. Send APG submission A alone.

---

## PRODUCT FACTS USED HERE (the agent system prompt is stale; these override it)
- **7 plugins.** Carbonator, De-Sipper, On Tap, Pour, TALLBOY at **$20 each**. FIZZFUEL $29. Still FREE.
- **De-Sipper is $20, not $25.** The "$20 -> $35 on April 30" urgency line is five months dead.
- Carbonator modes: Cola / Cherry / Grape / Lemon-Lime / Orange Cream. Tube/Tape/Transistor never shipped.
- **Still is macOS only.** Do not imply a Windows build. On Tap and Pour: Windows demo now, paid soon.
- `LISTING_COPY.md` and `outreach-emails.md` are stale archives - both sign "Miguel" and misdescribe
  the Carbonator flavours. Do not paste from either. Sign everything **Soda**.

---

## SEND / HOLD TABLE - 2026-09-08

| Outlet | Route | Verified | Call today | Gated on |
|---|---|---|---|---|
| Bedroom Producers Blog (Tomislav) | tomislav@bedroomproducersblog.com | Live 2-way thread | **SEND variant (B) TODAY** | nothing - it is unblocked |
| Audio Plugin Guy | news submission form | Form only, no email exists | **SEND submission A today** | nothing |
| Plugin Boutique | Asana developer form | Form; no dev email published | **SEND the Asana resubmit today** | nothing |
| Plugin Boutique (Gareth) | email in Sent Mail only | address not in repo | **HOLD** | Gmail |
| MusicTech | email route DEAD | re-verified live today | **DM James Langley only. Never email.** | Soda finding the handle |
| Rekkerd (Ronnie) | ronnie@rekkerd.org | verified, 8 items published | **HOLD until 2026-09-15** | APD window |
| In The Mix (Michael Wynne) | brand-enquiry form | verified | **HOLD** | DSP fix + touch count |
| Warren Huart | warren@producelikeapro.com | verified | **HOLD, likely DROP** | touch count (Sent Mail) |

Three sends are unblocked today and none of them need Gmail: **BPB (B), APG A, Plugin Boutique Asana.**
