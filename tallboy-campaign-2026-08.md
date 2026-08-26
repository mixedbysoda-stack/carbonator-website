# TALLBOY Zero-Budget Campaign
Prepared 2026-08-22. No paid ads anywhere in this plan. Everything below is
either done, drafted and waiting for your GO, or copy you paste yourself.

## State of play (already done before this plan)
- 11 branded partner/press drafts sitting in Gmail (ADSR, APD, Plugin Boutique,
  ProducerSpot, VST Alarm, KVR, Rekkerd, AudioNewsRoom, MusicRadar, Rys Up,
  Dan Worrall). Review and send.
- KVR Product Database listing live-ready: product id 37265, image attached,
  still set to Draft. Flip to Live when ready.
- ADSR Back to Studio sale Aug 24 - Sep 7 (FIZZFUEL + Carbonator at $19.99).
- APD 4-in-1 bundle Aug 31 - Sep 13.
Do not cannibalize those two windows with TALLBOY discounts. TALLBOY runs as a
new-release story at full price ($20 is already an impulse price).

---

## 1. New marketplaces (verified paths, all free to join)

### Plugivery - the big one
One application unlocks their whole dealer network (AudioDeluxe, JRR Shop,
PluginFox and dozens more resell through them). Verified from their site:
- Apply via their contact form: https://www.plugivery.com/about/contact/?type=general
- No upfront cost. Simple hand-shake agreement, 30-day exit clause.
- They need: a batch of serial numbers (or a secure key-gen endpoint on your
  server - your Netlify functions can do this), and installers hosted at fixed
  URLs (your GitHub releases already qualify).
Paste this into their form:

    Subject: Distribution inquiry - Carbonated Audio (7 plugins)

    Hi, I run Carbonated Audio (carbonatedaudio.com), a one-person plugin
    company with seven released plugins: Carbonator, De-Sipper, On Tap, Pour,
    FIZZFUEL, Still (free) and TALLBOY, our new chiptune resynthesiser.
    All are one-time purchase, serial-number licensed, no iLok. macOS
    universal (VST3/AU/AAX, Pro Tools signed) and Windows VST3, with
    installers hosted at fixed URLs. I can supply serial batches or a secure
    key-generator endpoint. We already sell direct and through ADSR and
    Audio Plugin Deals. Interested in distribution through your dealer
    network. What do you need from me to get started?

### Loot Audio
Boutique marketplace, actively recruits plugin developers ("great incentives
for plugin developers" on their support page). No public email - use the
contact form at lootaudio.com. Paste:

    Subject: Developer submission - TALLBOY chiptune resynth + 6 more plugins

    Hi, I would like to sell my plugins at Loot Audio. I run Carbonated Audio
    (carbonatedaudio.com) - seven released plugins, the newest being TALLBOY,
    a chiptune resynthesiser and bitcrusher ($20). Serial-number licensing,
    macOS VST3/AU/AAX universal + Windows VST3, installers ready, artwork
    ready. What is your onboarding process?

### itch.io - self-serve, list it today
Real marketplace for paid VST tools (itch.io/tools/tag-vst has an active paid
section). Perfect audience overlap: chiptune, game audio, retro. You set the
revenue share yourself (default 10% to itch). Steps: create account, New
Project, classify as Tool, upload demo build + link to site for paid version
OR sell the full version directly on itch with keys.

Listing copy, paste-ready:
- Title: TALLBOY
- Short tagline: Your track, played back on a handheld. Chiptune resynth,
  arp and bitcrusher in one cartridge slot.
- Price: $20 (or Buy on itch + demo download free)
- Tags: vst, audio-plugin, music, chiptune, 8-bit, retro, tool, effects
- Cover: crop tallboy-screenshot.png to 630x500
- Description: reuse the KVR listing text (kvr-listing-tallboy.md), swap the
  closing line for: "The free demo build here is macOS VST3/AU. Windows demo
  coming - the paid version ships Windows VST3 today."
CORRECTED 2026-08-26: this file previously claimed there was no Windows demo
build. That was wrong. Both Windows builds exist and were verified live:
TALLBOY-Windows-Installer.exe (paid, wired into config.js) and
TALLBOY-Demo-Windows-Installer.exe (demo, under the v1.0.0-demo tag).
tallboy.html already swaps the demo href for Windows visitors via UA
detection, so the itch and Reddit Windows audience is fully served. No gap.

### KVR Marketplace - already approved, 10 minutes
Product 37265 exists, so Core Settings now unlocks. Flip product Live, tick
"Sell Via KVR", create a Selling Profile at $20, upload keys or point at your
key-gen. KVR then sells it on their own store traffic. Zero cost.

### Skipped, with reasons
- VSTBuzz: dead - merged into Audio Plugin Deals (vstbuzz.com redirects).
  You already have APD.
- Tracktion Marketplace: in-app store, stale program, no active third-party
  intake found. Not worth chasing.
- Thomann B2B: contact is on your suppression list. Do not reopen.

---

## 2. New press (free, high fit)

### Bedroom Producers Blog - your biggest untouched outlet
Marked TODO in outreach-emails.md since April and never sent. They are the
single best-fit outlet for a $20 chiptune plugin and they also love that
Still is free. Their About page says use the contact form (Tomislav reads
everything personally); your directory has tomislav@bedroomproducersblog.com.
BRANDED DRAFT CREATED IN GMAIL - review and send, and if it bounces use the
form at bedroomproducersblog.com/contact.

### CDM (Create Digital Music)
Peter Kirn's outlet, covers exactly this: weird instruments, chip music,
D-pad interfaces, indie DSP stories. They have a "Submit a news item" link on
cdm.link. Paste the AudioNewsRoom press-release text from your Gmail drafts
(it is already in liftable press format) plus the product URL.

---

## 3. YouTube seeding - TALLBOY edition
Your youtube-outreach-targets.md was built for Carbonator (saturation/mixing
channels). TALLBOY is a different buyer: synth, sound design, chiptune, game
audio. Re-ranked for TALLBOY:

Strong fit, email known - BRANDED DRAFTS CREATED IN GMAIL:
1. BoBeats (~140K, bonurmimusic@gmail.com) - affordable gear + synths, exactly
   his lane.
2. Help Me Devvon (~258K, hmdmixing@gmail.com) - vocal-effect content; the
   "vocal double on a sound chip" demo is made for him.

Strong fit, grab email from channel About tab (5 min each, then reuse the
draft template below):
3. Venus Theory - sound design, creative tools. Highest ceiling.
4. White Sea Studio - plugin walkthroughs, likes weird.
5. BoBeats-adjacent: Simon Servida, AudioPilz (Bad Gear) - chip/retro humor
   fits TALLBOY perfectly. Verify channels before emailing.
Weak fit for TALLBOY (keep for the next mix-tool launch): Mastering The Mix,
Simply Mixing, Sage Audio, Baphometrix, Music Guy Mixing.

Template (matches the drafts):

    Subject: A plugin with no knobs - vocal resynth on a 4-channel sound chip

    Hey [Name],
    I build plugins as Carbonated Audio. Just shipped TALLBOY - it pitch-tracks
    whatever you feed it and replays the performance on four modelled console
    sound chip channels, then arpeggiates and decimates it. No knobs: you
    drive it with a D-pad and a dot-matrix screen. $20.
    I would love to send you a full license, no strings. If it makes a video,
    great. If not, keep it.
    Demos on the page: https://carbonatedaudio.com/tallboy
    - Soda

### The video that does the seeding for you
Before emailing bigger channels, put ONE 60-90s video on your own channel:
dry vocal -> TALLBOY 4BIT CHOIR preset -> arp on -> CRUSH ROM in. Screen
recording of the dot-matrix UI + before/after audio. Every pitch email then
links a video instead of a wall of text. This is the highest-leverage
half-day in this plan.

---

## 4. Community posts (you post these - accounts are personal)

### KVR News item (I can publish this from your dashboard on GO)
Title: Carbonated Audio releases TALLBOY - chiptune resynthesiser and
bitcrusher for macOS and Windows
Body: use the AudioNewsRoom press release text + product page link + $20.
KVR news feeds their homepage and newsletter pool. Free.

### Gearspace - Product Alerts forum
    Title: TALLBOY - pitch-tracked chiptune resynth, arp + bitcrusher, $20

    Hey everyone, Miguel from Carbonated Audio. New release: TALLBOY.

    It tracks the pitch and envelope of your audio and rebuilds the
    performance on four modelled console sound chip channels - two pulse
    channels with four duty cycles, a 32-sample 4-bit wavetable, and LFSR
    noise keyed off transients. Behind that: a host-synced arp (1/4 to 1/32,
    five modes, four octaves, 400 ms glide) and a decimator (1-16 bit, rate
    divide 1-64 with jitter, post filter to 540 Hz). Three cartridges, each
    inserts/ejects independently. All three out = true passthrough, nulls
    against dry.

    No knobs. D-pad + four-shade dot-matrix screen, six parameters per
    cartridge.

    $20 one-time, 3 machines, no iLok, no subscription. macOS VST3/AU/AAX
    universal, Pro Tools signed. Windows VST3 64-bit. Free demo (macOS,
    no email required): https://carbonatedaudio.com/tallboy

    Happy to answer anything about the DSP - the pitch tracker and the
    11-bit frequency-register detune were the hard parts.

### Reddit (check each sub's current self-promo rules before posting -
they change, and a removed post burns the account)
- r/chiptunes - best audience match on the site. Angle: "I made a VST that
  replays your vocal on a 4-channel chip - honest dev post." Lead with a
  30s video/audio clip, price in a comment, not the title.
- r/synthesizers - gear-curious, likes weird interfaces. Angle: the no-knobs
  D-pad UI. Post the UI clip, discuss in comments.
- r/WeAreTheMusicMakers - use their promo-allowed thread/flair only.
- r/gamedev - only in tools/screenshot threads; angle: soundtrack tool for
  game jams, CRUSH ROM for authentic asset degradation.
Title that worked-shaped: "I spent 6 months building a plugin with no knobs -
you drive it with a D-pad. It resynthesizes your voice on a 4-channel sound
chip." First comment: demo clips, price, link.

### Chip scene
Battle of the Bits and the chiptune Discords are where the real chip heads
are. Join, be a person for a week, then share. Do not drive-by post.

---

## 5. Owned channels - free demand you already have

### Referral loop (already built, never pushed)
render.js variant D has the refBlock: every customer gets a share link;
a referred sale = their next plugin free. Send one email to all past buyers:
"TALLBOY is out. Also: your referral link gets you our next plugin free."
Use your existing customer list flow (BCC batch like the Aug 4 send, minus
suppression list). Copy:

    Subject: TALLBOY is out - and your link earns you the next plugin free

    Hey [name],
    New one: TALLBOY. It pitch-tracks your audio and replays it through a
    four-channel handheld-console sound chip, then arpeggiates and crushes
    it. No knobs - a D-pad and a dot-matrix screen. $20 one-time.
    https://carbonatedaudio.com/tallboy
    Also, quiet feature you may have missed: your personal referral link is
    in your purchase email. When someone buys through it, you get our next
    plugin free. TALLBOY counts.
    - Soda

### Still -> TALLBOY funnel
Everyone who grabbed Still (free) is a warm lead who already installs your
stuff. Same email as above works; they are in your leads store from
capture-lead.js / backfill-leads-to-sheets.js.

### SEO pages on carbonatedaudio.com (compounding, free)
The repo IS an SEO site - use it for TALLBOY queries. Next articles to ship,
in priority order (I can write any of these on GO):
1. "chiptune vst" / "chiptune plugin" - listicle-beating product-adjacent
   guide: How to make chiptune from any audio (with TALLBOY as the method).
2. "8 bit vocal effect" - tutorial: 8-bit vocals in any DAW, 3 steps.
3. "bitcrusher vs decimator" - technical explainer, CRUSH ROM as example,
   internal-links to /tallboy.
4. "game boy style music in a daw" - CAREFUL: write around the trademark;
   target "handheld console music" phrasing in copy, the query can be in
   the slug/H1 as a nominative reference. Your call - flag it when I write.

---

## 6. Content engine - 14 shorts, one afternoon of recording
One vertical format: phone or OBS capture of the plugin + big captions.
Each is 15-30s. No trademarked names on screen or in copy.
1. Dry vocal vs 4BIT CHOIR preset. Caption: "your voice, but 1989"
2. The no-knobs rant: "I shipped a plugin with zero knobs. On purpose."
3. D-pad navigation ASMR - just driving the UI, chip audio underneath
4. Bass line -> chip bass. "the $20 bass doubler"
5. START button null test - "true bypass or refund"
6. Arp modes speedrun: UP DOWN UPDN RAND CHRD in 20 seconds
7. CRUSH ROM on drums only - "the right way to crush drums"
8. Wrong way on purpose: full mix through the resynth chasing partials -
   "this is why it says monophonic"
9. Glide 400ms on a vocal - portamento meme potential
10. Making a game-jam soundtrack from one hummed take
11. Cartridge eject animation loop - oddly satisfying cut
12. "Every preset in 30 seconds"
13. Counter-melody trick: hook -> CHRD arp -> new topline
14. Build story: "no iLok, no subscription, $20, because I hate the
    alternative too"
Post native to Shorts + Reels + TikTok, same file. Link in bio ->
/tallboy?utm_source=shorts.

---

## 7. Ops
UTM every link you post:
  /tallboy?utm_source=reddit&utm_medium=post&utm_campaign=tallboy-launch
  sources: reddit, gearspace, kvr, itch, bpb, cdm, yt, shorts, email
Follow-up cadence: your existing 4-day bump then 7-day close-out, verbatim
from outreach-emails.md. Applies to every email in this plan.
Suppression: check email-suppression.txt + suppression.js before ANY batch
send. Current list: frankbugbee10, tom@thomann.de, mangor@web.de.
Weekly scorecard (10 min, Mondays): sessions by utm_source, demo downloads,
Stripe TALLBOY sales, KVR MyKVR stats, replies owed.

## 8. GO list - say the word and I execute
1. SEND the 11 partner/press drafts already in Gmail (or cherry-pick).
2. SEND the 3 new drafts: BPB, BoBeats, Help Me Devvon.
3. PUBLISH the KVR news item from your dashboard (browser is connected).
4. FLIP KVR product 37265 Draft -> Live (and optionally set up Sell Via KVR).
5. SUBMIT the Plugivery contact form with the pitch above.
6. SUBMIT the Loot Audio contact form with the pitch above.
7. SUBMIT CDM news item with the press-release text.
8. WRITE SEO article #1 (chiptune vst guide) into the repo.
Reddit, Gearspace, itch.io, Discords: yours - accounts are personal and the
posts read as you. Copy is above.
