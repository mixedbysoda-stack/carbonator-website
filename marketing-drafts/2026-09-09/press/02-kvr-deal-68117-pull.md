# KVR DEAL 68117 - PULL IT TODAY - APD EXCLUSIVITY EXPOSURE
New this run. Highest-priority item in the whole 2026-09-09 run.

## WHAT IS LIVE RIGHT NOW
https://www.kvraudio.com/news/all-6-carbonated-audio-plugins-45-68117
Started **2026-08-17**. Fetched and read today, 2026-09-09. It still says, verbatim:

> "All 6 Carbonated Audio plugins are $45 through September 30, 2026 (normally $109)."

and it links to:

> https://carbonatedaudio.com/bundle?utm_source=kvr&utm_medium=referral&utm_campaign=september_bundle&utm_content=deal_68117

## WHY THIS MATTERS
1. **APD exclusivity.** On 2026-08-26 we promised Audio Plugin Deals in writing that their page
   would be "the only discounted way to buy any of it." The window runs 2026-08-30 to
   2026-09-14T23:59:59Z. This KVR listing is a public, currently-running advertisement of a bundle
   discount on a non-APD route. It predates the promise by nine days, which explains it but does not
   fix it.
2. **The landing page now contradicts the ad.** `apd-window.js` removes the discount markup during
   the window, so anyone arriving from KVR expecting $45 lands on $129. The site is behaving exactly
   as designed; the problem is that the ad outside it was never taken down. Right now this reads as
   bait-and-switch to every KVR visitor who clicks.
3. **It is factually wrong twice.** Six plugins - there are seven, TALLBOY shipped. $45 off $109 -
   the sale is $55 off a $129 regular.
4. **The end date is wrong too.** "through September 30" is a date nothing in the codebase supports.
   `nav.js` SALE_ENDS is 2026-09-30 but that flag does not raise any price.

## WHAT TO DO, IN ORDER
1. **Today:** log into the KVR developer dashboard (still on the legacy `carbinated-audio` slug) and
   expire or delete deal 68117. Fastest possible removal, no email needed.
2. **Today, if 68117 cannot be pulled within the hour:** email the APD contact and disclose it
   yourself, before they find it. Draft below. Self-reporting a nine-day-old listing you forgot to
   pull is a small conversation. Being caught mid-exclusive by a partner is a different one, and APD
   is running a 64%-off promo for us.
3. **On 2026-09-15, not before:** re-post it corrected - 7 plugins, $55, regular $129, with a real
   end date.

## DRAFT - only send if step 1 cannot be completed today

TO: [APD contact]
SUBJECT: Heads up from my side - an old KVR listing I missed

Hey,

Doing an audit of everywhere our bundle is advertised and I found something I should tell you about
rather than let you find.

A KVR deal listing of ours went up on August 17, before we agreed the exclusive with you, and I
failed to pull it down when the window opened. It is still showing an old bundle price. Our own
pages have been running the non-discounted price since August 30 exactly as agreed, so anyone
clicking through from that listing lands on the regular price and cannot actually buy at the old
number - but the listing itself should not have been up, and that is on me.

I am having it removed today. If you want me to do anything else on my end, say the word.

- Soda
Carbonated Audio

## APD COMPLIANCE OF THIS FILE
The email above quotes no price and links to no checkout. Deliberate.
