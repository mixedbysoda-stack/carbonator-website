# Inbox findings - 2026-09-11

Gmail via the claude.ai connector. Queries excluded from:hello@carbonatedaudio.com. I checked `list_drafts` first to avoid duplicates.

## Replies from the named outlets (14 days, trash included)
MusicTech, Plugin Boutique/Beatport, Warren Huart / Produce Like A Pro, Rekkerd, Audio Plugin Guy, In The Mix, MusicRadar, KVR, Audiofanzine: **no replies.** The query returned an empty set.

## Real replies that did land
### Robin Vincent, Molten MT (thread 19cdee33192ec715), replied 2026-09-11 08:40Z
"I'll mention them if I have room this month. Unfortunately I don't have time to review them."
- A reply draft **already exists**, created 2026-09-11 12:13Z by another session: draft `r7873576221004840157`. I didn't duplicate it.
- FLAG: that draft repeats "a 20% code with your name on it". See APD notes below.
- FLAG: the outbound 09-10 email on this thread was signed "Miguel (Soda)" and opened "Miguel here". That breaks the Soda-only persona rule.

### Jay / Beatscribe (thread 1a08d8860ea7de34), replied 2026-09-10 23:11Z: "I'll check it out sure"
- A reply draft **already exists**: `r-1152112896942481958` (12:13Z today). It offers a free TALLBOY key and says the demo is macOS-only. That matches tallboy.html's FAQ (the demo covers macOS VST3/AU). Also mentions "the 20% code". Same APD flag.

### Bedroom Producers Blog (Tomislav)
- The brief said a reply *draft* was created 2026-09-10. **In fact both BPB replies were SENT** on 2026-09-10 at 21:43Z: the apology in trashed thread 19fca48a5bd1fb3f, and the Still-issue disclosure in live thread 1a02ae5a80eaf57e. Tomislav hasn't replied since. No re-draft.

## New draft created today
### ADSR / Gage: TALLBOY launch hold (thread 1a02aac3a19e5f96, which is in TRASH)
Gage asked on 2026-08-26 "should we hold launch til the mac files are finished?" and it has had **no reply for 16 days**. Gmail draft **`r-8669056036866693249`**.

TO: gage@adsrsounds.com
SUBJECT: Re: TALLBOY assets - press kit, screenshots and keys
BODY:
Hey Gage,

Sorry, this one slipped past me. Yes, please hold TALLBOY for now.

The plugin binaries are universal, but the current Mac installer makes some Apple Silicon machines ask for Rosetta. I would rather your customers never see that on day one.

As soon as the corrected Mac installer is up I will send the new file, and you can launch whenever suits you after that. Nothing else in the assets changes.

Thanks for offering to wait.

Soda
Carbonated Audio

ASSUMPTION: the Rosetta-fixed Mac installer has still not shipped. The last evidence is Soda's 2026-08-30 email to Yan ("the corrected installer is not up yet"), and no TALLBOY installer commit has landed since. If it has shipped, edit the draft to "no need to hold, here is the new file". Yan (ygestelgoog@gmail.com) is waiting on the same fix.

Also open with ADSR: Soda offered Pour for the paid-only freebie slot on 2026-08-31. Gage hasn't answered in 11 days. Pour is macOS-only, and any free-with-purchase run must land after 2026-09-14.

## Creator blast, sent 2026-09-10 ~23:02Z (about 22 emails)
Subjects were "Free plugins + 30% on sales for ..." and "TALLBOY (Game Boy chip plugin) + 30% ...". The only genuine reply is Beatscribe. (An Inlay licensing cold pitch also matched the query; that's a vendor, so I ignored it.)

## APD flags (please read)
1. The creator emails and the two drafts above promise "a 20% code for your audience" **during the exclusivity window**. The /creators page, line 190, says codes are paused during a partner exclusive. Stripe currently has **no creator promo codes minted**, so nothing is redeemable yet. That makes it a wording risk, not a live leak. Safest fix before sending the two drafts: add "codes go live September 15", or drop the code line.
2. **Four legacy discount codes are ACTIVE in live Stripe today:** BUNDLE25 (50 max, 0 used), BUNDLE30 (50 max, 0 used), OWNER20 (20 max, 1 used), BUNDLEFAM20 (3 max, 0 used). If any live checkout has promo codes enabled, these are a discounted route during the window, which conflicts with the written APD promise. I did not change anything in Stripe.
3. The 2026-09-09 bundle sale charged **$109**, not the $129 the brief says the site shows during the window. Probably harmless, since it's above $55 and not a discount, but the checkout price and the page copy disagree.
