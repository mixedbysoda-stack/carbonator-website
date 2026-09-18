# Task 2 inbox findings - 2026-09-10

## Headline finding: BPB "day 35 demo video" story does not check out

The brief's thread id `19fca48a5bd1fb3f` returned "The caller does not have permission" on
`get_thread` on two separate attempts with different messageFormats. More importantly, no Gmail
search (by sender, by date range Aug 1-15, by subject/keyword "feature"/"demo"/"video"/"Still")
turns up any Aug 5-2026-08-06 exchange with Bedroom Producers Blog in which they call Still
"definitely something we could feature" or ask for a demo video, and no Aug 6 promise from Soda
to make one.

What is actually in the mailbox for BPB:
- 2026-03-11 to 2026-03-31: Carbonator pitch. BPB's real reply (2026-03-22) was a **paid
  sponsorship offer, $250** for a news + review package - not a free-feature interest.
- 2026-05-04: Tonic v2.0.0 pitch sent. No reply on record.
- 2026-04-08: De-Sipper pitch sent. No reply on record.
- 2026-08-22: TALLBOY pitch sent to tomislav@bedroomproducersblog.com (thread `1a02ae5a80eaf57e`),
  offering TALLBOY plus Still free for readers. **This is the real open BPB thread.**
- 2026-09-01: One bump sent on the TALLBOY thread ("just bumping this in case it got buried").
- No reply from BPB since. 9 days silent on the bump, 19 days since the original.

Conclusion: the "warmest press lead, day 35, promised video" narrative in the task brief is not
supported by anything in this Gmail account. Either it refers to a thread outside this mailbox, or
it is inherited/confabulated context from an earlier run. Treated as unverified and NOT acted on
as fact. Did not send variant (b), or any variant, into the cited thread id - it is not accessible
and its premise could not be confirmed.

Action taken instead: drafted a grounded, honest follow-up on the real live BPB thread
(`1a02ae5a80eaf57e`) that proactively discloses the Still phase-artifact bug (which IS real and
verified via the adamtvmedia thread + GitHub push history) without promising a fix date, in the
spirit of hard constraint #2 and #3's "honest, asset-free, no date" instruction - just attached to
the thread that actually exists. See `01-bedroom-producers-blog.md`.

## KVR deal 68117 - never emailed, confirmed

Searched `in:sent kvraudio` (8 threads) and `68117 OR "kvraudio.com/news"` (0 threads). Every
sent email to KVR is a routine product/news submission (Carbonator Mar 11, De-Sipper Apr 8, Tonic
May 4, FIZZFUEL Jul 5 + Aug 4 follow-up). None mentions deal 68117, a pull request, or the
discount-leak compliance issue. **KVR was never contacted about pulling the listing.** The
pull-request draft at `2026-09-09/press/02-kvr-deal-68117-pull.md` sat unsent for at least one full
day (written 09-09, still unsent as of 09-10).

Also confirmed: Audio Plugin Deals (Joe) has not raised 68117 either - no message from
joe@audioplugin.deals or yemi@audioplugin.deals since 2026-08-24.

Per the existing draft's own priority order, step 1 (pull the listing from the KVR dashboard
directly, no email needed) is the fast path and is outside Gmail's reach from this task. Flagging
as a manual action. Drafted step 2 (self-disclosure to APD) as a real Gmail draft since it is
low-risk, APD-exclusivity-compliant (no price, no code, no link), and closes the "did we tell them
before they found it" gap regardless of whether step 1 happens today. See
`02-apd-kvr-disclosure.md`.

## Other outlets - verified no reply

- **MusicTech / MusicTech.net**: zero threads found, sent or received, in this mailbox in 90 days.
- **Audio Plugin Guy (audiopluginguy.com)**: zero threads found in this mailbox at all. The brief's
  claim that Carbonator + De-Sipper articles are "published" there cannot be verified from Gmail -
  either that outreach happened through a channel outside this inbox, or the coverage claim is
  unverified. Flagging as "could not verify" rather than confirming or denying.
- **Rekkerd (ronnie@rekkerd.org)**: two outreach sends on record (2026-08-04 FIZZFUEL+Still,
  2026-08-22 TALLBOY, "fifth time asking"). No reply to either in this mailbox. Both messages imply
  a real prior coverage relationship ("you've covered us four times") but no inbound reply exists
  for the last two asks.
- **Warren Huart / Produce Like A Pro**: last real outreach was 2026-03-11 through 2026-04-08 (four
  sends). Only auto-ticket confirmations came back (#24302, #24721) - never a human reply, ever, on
  record. Nothing sent since April. Not re-contacted today - this would be a blind re-contact,
  which the brief explicitly says not to do.
- **In The Mix / Michael Wynne**: no threads found under any search variant. No evidence Carbonated
  Audio has ever emailed this outlet.
- **Plugin Boutique**: NOT actually silent - it was resolved on 2026-08-27. James Freeman declined
  the submission on 2026-08-21 ("not the right time"), Soda replied 08-26 accepting it gracefully,
  and Freeman closed the loop 08-27 ("revisit in at least 12 months, we'll ignore the ticket"). The
  "29+ days silent" pending item in the standing brief is stale - there is nothing to nudge. This
  should be marked resolved/closed, not pending.
- **Audiofanzine**: confirmed no outreach email exists and no email address is on file - only a
  Google sign-in notification from Soda's own account login to their site (2026-08-24). Matches the
  brief's note that this is a tip-form to-do, not a Gmail item. No draft produced.
- **adamtvmedia (Still group-delay bug reporter)**: thread `19fcc407ea4ee7c8` fully read. Last
  message 2026-08-09: Adam agreed to test a fixed build when ready and gave quote permission
  (first name only). No further message from Adam since. Nothing to draft - the honest thing is to
  wait until there is actually a fix; sending "still working on it" 32 days later with zero
  progress (confirmed via GitHub: zero commits in 58 days) would not be an improvement on silence.

## Stale drafts found sitting in the Drafts folder (not press, flagging per instructions)

Two drafts exist, both dated 2026-09-09, both incomplete:
1. **"Re: TALLBOY installer requests Rosetta"** to ygestelgoog@gmail.com (Yan). Contains an
   unresolved placeholder: `[STATUS LINE - fill before sending: either "the corrected installer is
   live" or "it is still not up"]`. Cannot go out as-is.
2. **"ADSR settlements - May invoice status, plus June and July"** to gage@adsrsounds.com. Appears
   complete and ready to review/send, chasing a $36 May invoice unpaid 72+ days past 28-day terms.

Neither is a press/outreach draft in scope for this task, so left untouched. Flagged for Soda.
