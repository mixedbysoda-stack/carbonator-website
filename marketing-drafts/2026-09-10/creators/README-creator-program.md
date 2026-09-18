# Creator program - how to run it (2026-09-10)

Terms (locked in this session): free All 7 license via a one-use 100%-off review
code, a personal 20% audience code good for 12 months, 30% of net (price minus
Stripe fee) on every order that uses it, paid monthly by PayPal, no minimum.
Public terms page: https://carbonatedaudio.com/creators (live once the
70e30dc commit is pushed). Applications from that page land in Netlify Blobs
store `creator-applications` and in your inbox.

## What exists

- 22 Gmail DRAFTS, one per creator with a published email, already personalised
  (first name, lead plugin, one specific hook). Subject starts with "Free plugins",
  "TALLBOY (Game Boy chip plugin)" or "All 7 Carbonated Audio plugins". Robin
  (Molten Music Technology) is a reply on the March Carbonator thread. MrDifferentTV
  was skipped on purpose (near-zero engagement).
- creators-wave1.csv: the same 22, in the exact column layout
  scripts/create-creator-codes.js reads.
- creators-form-only.md: 34 more targets that only have a contact form or the
  YouTube About-page email button. Same pitch, paste from templates.md.
- creator-targets-full.csv: all 57 with followers, lane, angle, source URL, notes.
- templates.md: first touch, the "you're in" email with codes, and the day-5 nudge.

## The loop

1. Read and send the drafts. They do NOT contain codes on purpose: codes are minted
   only for people who reply, so Stripe stays clean and nobody gets a code they
   never asked for. Do not send before /creators is live (push 70e30dc first).
2. When someone replies "in":
       printf 'Stripe secret key: '; read -rs STRIPE_SECRET_KEY; echo; export STRIPE_SECRET_KEY
       node scripts/create-creator-codes.js --slug=chipzel --name="chipzel" --email=mgmt@chipzel.co.uk
   It prints a paste-ready block (audience code + review code + bundle link) and
   appends to creator-codes-ledger.csv (gitignored). Paste the block into the
   "you're in" template and reply. The review code goes through the normal
   checkout at $0, so the webhook mints their 6 keys and sends the delivery email
   exactly like a customer's - no key generator, no manual attachment.
3. First week of each month:
       node scripts/creator-payouts.js
   Prints per-creator commission for the previous month and writes two CSVs.
   Pay via PayPal, forward each creator their rows from the -orders.csv.

## Rules that protect existing deals

- Partner exclusives: the audience codes are Stripe promotion codes, so they are
  automatically dead while allow_promotion_codes is off on the payment links
  (that is how the APD window was enforced). Tell active creators before a window
  opens; the /creators page already says codes pause during marketplace deal weeks.
- Pour must stay undiscounted and off every other store through Oct 31 (ADSR
  freebie). A creator code is a discount on carbonatedaudio.com only, which is
  the "real price elsewhere" Gage wants - but do not run a Pour-specific creator
  push in October.
- The review code is restricted to the All 7 bundle product resolved from the
  $55 link (buy.stripe.com/dRmbJ16AFbBgcLT6f13oA0k). If that link changes,
  pass --review-link=<new slug>.

## Caveats on specific targets

- Beatscribe: email came from a public itch.io comment, not an official page.
- Make Pop Music: support@ is a generic inbox; expect a gatekeeper.
- mixedbyyeldo (~6 months since last upload), Shirobon (~7 months): check
  activity before sending.
- Over 100K (Billy Hume, Make Pop Music, MixbusTV, Lollypopbeatz, Based Gutta):
  included because they review plugins often; response rate will be lower.
- Sizes marked "~unverified" in the CSV were not confirmed by a third-party
  counter; verify on the channel before minting a review copy.
