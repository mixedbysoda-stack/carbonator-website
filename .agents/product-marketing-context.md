# Carbonated Audio — Product Marketing Context

*Last updated: 2026-08-17. Treat this file, the Carbonated Audio Obsidian operating docs, Stripe, and Netlify Blobs as authoritative. Do not reuse old sales totals, compatibility claims, or expired offers from historical notes.*

## Business snapshot

**Company:** Carbonated Audio — independent audio-plugin maker for producers, beatmakers, home-studio artists, and mixing engineers.

**Near-term objective:** make the September bundle and the Still lead path reliably convert, then use measured creator/press/SEO distribution to build toward $5K/month.

**Current offer:** all 6 plugins for **$45 through Sep 30, 2026**, normally $109. Public checkout code: `ALL6FOR45`. This is a time-bound campaign, not a permanent price reset.

**Revenue truth:** use Stripe-confirmed orders, never GA4 alone. GA4 is for traffic, lead, and checkout-intent analysis.

## Product lineup

| Product | Job | Price | Availability / format truth |
| --- | --- | --- | --- |
| Carbonator | Five-flavor saturation / character | $20 | macOS: VST3/AU/AAX + Standalone; Windows: VST3 + Standalone |
| De-Sipper | Transparent vocal de-essing | $20 | macOS: VST3/AU/AAX + Standalone; Windows: VST3 + Standalone |
| On Tap | MIDI-triggered sidechain ducking | $20 | macOS: VST3/AU/AAX; paid Windows build in progress |
| Pour | M/S stereo imaging | $20 | macOS: VST3/AU/AAX; Windows build in progress |
| FIZZFUEL | Gearbox-style creative multi-effect | $29 | macOS: VST3/AU/AAX; Windows: VST3 |
| Still | Adaptive one-dial noise suppression | Free | macOS: VST3/AU/AAX; Windows build in progress |

**Do not claim:** all six have Windows support, all six have AAX on Windows, universal AAX, endorsements/testimonials not on the page, or a fake customer count.

## The lead product: Still

Still is the primary lead magnet. It removes hiss, hum, and room noise in real time with one adaptive control. The free download triggers email delivery and stores a lead in Netlify Blobs, then syncs to the reporting Sheet.

**Post-download path:** De-Sipper is the primary vocal-chain recommendation; the $45 all-six offer is a small secondary nudge. Never delay, gate, or make the Still download contingent on an upsell.

## The flagship creator story: FIZZFUEL

FIZZFUEL’s memorable mechanism is a manual gearbox: Drive, Reverb, Delay, Pitch, Filter, and R for a clean reference. It has 20+ styles and gear changes preserve effect tails.

**Best proof:** level-matched before/after clips and a real screen capture of Gear → R → Gear. Avoid generic "AI plugin ad" visuals or fake UI animation.

## Audience and jobs to be done

- Add warmth, grit, and character without complex menus.
- Clean a vocal without killing air.
- Create kick-driven movement without compressor routing.
- Widen a mix while keeping its center.
- Change energy with one creative workflow instead of stacking effects.
- Remove recording noise quickly.

**Core emotional tension:** "I want a sound-changing result fast, without expensive subscriptions, cluttered workflows, or gear that I cannot trust."

## Positioning and tone

**Voice:** confident, playful, direct, producer-to-producer. Short punchy sentences. No corporate language.

**Message hierarchy:**

1. Show/hear the job the plugin solves.
2. Show the real interface or a real A/B moment.
3. Explain the one-time price and ownership.
4. Give the relevant CTA: free Still download, individual product, or time-bound bundle.

**Safe proof:** real UI, actual audio, official product formats, clear price, existing press mentions only where verified. Avoid inflated "better than" claims.

## Acquisition priorities

1. **Press and creator outreach:** strongest existing proof path. Prepare the FIZZFUEL review pack first (three level-matched clips, one gearshift screen recording, installer/license, UTM link).
2. **SEO comparison/use-case pages:** target exact commercial questions and maintain honest competitor framing.
3. **Short-form content:** real plugin UI/audio, captions, tracked bundle link. No AI actors.
4. **Still lead nurture:** value first; use a light bundle offer for engaged people, not an immediate blanket discount sequence.
5. **Reddit/community:** contribute genuinely and follow each community’s self-promotion rules; do not spam or post low-context buy links.

## Measurement

- **Lead:** `generate_lead` plus Netlify Blobs / Sheet record.
- **Checkout intent:** `begin_checkout`, including `checkout_placement` and UTM context.
- **Purchase:** Stripe webhook event sent to GA4; Stripe is authoritative.
- **Decision window:** after new partner/campaign traffic, wait 7–14 days or 100 qualified bundle-page visits before judging the offer.

## Links and campaign standards

- Bundle: `https://carbonatedaudio.com/bundle`
- FIZZFUEL: `https://carbonatedaudio.com/fizzfuel`
- Still: `https://carbonatedaudio.com/still`
- Use UTM source, medium, campaign, and content on every partner/creator/social link.
- Current short-form campaign format: `utm_source=shortform&utm_medium=organic_video&utm_campaign=september_bundle&utm_content=[asset]`.

## Current operating constraints

- The $45 offer needs distribution and a verified click-to-checkout sample before paid ads.
- Do not lower individual prices automatically or extend the September deal without data.
- KVR deal/news submissions require approval; monitor rather than assuming they are live.
- Do not claim GA4 purchase journey is complete until a real CTA click is observed in DebugView/Realtime and reconciled with Stripe behavior.
