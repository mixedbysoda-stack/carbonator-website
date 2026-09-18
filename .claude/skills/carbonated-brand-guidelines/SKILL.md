---
name: carbonated-brand-guidelines
description: Applies Carbonated Audio's brand colors, typography, product accent colors, voice, and claim rules to any artifact (HTML pages, emails, store listings, social posts, slides, docs, ad creative). Use whenever something should look or sound like carbonatedaudio.com, or when brand colors, style guidelines, or company design standards apply.
license: Derived from the Anthropic brand-guidelines skill template (Apache 2.0, see LICENSE.txt). Brand values are Carbonated Audio's own, taken from shared.css and .agents/product-marketing-context.md.
---

# Carbonated Audio brand styling

Source of truth: `shared.css` (`:root` tokens and `.product-*` accents) and
`.agents/product-marketing-context.md` in the carbonator-website-seo repo. If those files
disagree with this skill, the files win. Update this skill when they change.

## Colors

Backgrounds (dark theme, always):

- `--bg-primary: #0d0a1a` page background
- `--bg-secondary: #151025` sections
- `--bg-card: #1a1430` cards
- `--bg-card-darker: #120e22` nested / inset cards
- `--border: #2a2440` hairlines

Text:

- `--text-primary: #ffffff`
- `--text-secondary: #a09bb5`
- `--text-muted: #6b6580`

Brand accents:

- `--orange: #ff6b2b` primary CTA / brand
- `--orange-light: #ff8c42` hover
- `--pink: #ff3366`
- `--magenta: #cc33ff`
- `--red: #e63946`
- `--yellow: #ffd700`
- `--cyan: #00d4ff`

Signature gradients:

- Sale bar / headline text: `linear-gradient(90deg, #ff6b2b 0%, #cc33ff 100%)`
- Primary button: `linear-gradient(135deg, var(--orange), var(--pink))`

Per-product accent (use `--product-accent` and a matching low-alpha glow):

- Carbonator `#f59e0b`
- De-Sipper `#22d3ee`
- On Tap `#60a5fa`
- Pour `#a78bfa`
- FIZZFUEL `#e879f9`
- Still `#6fc7bc` (also the FREE badge color, on `#07201c` text)

## Typography

- Headings and body: Inter (400-900), fallback -apple-system, BlinkMacSystemFont, sans-serif
- Labels, prices, technical text, eyebrow captions: JetBrains Mono (400-500)
- Display weights are heavy: 800-900, tight tracking (-.04em) on large headings
- Small caps labels: uppercase, letter-spacing .06em to .12em, 9-13px, weight 700-900
- Body line-height 1.6

Load fonts from Google Fonts: Inter wght 400;500;600;700;800;900 and JetBrains Mono wght
400;500, with display=swap.

## Shape and depth

- Cards: 11-16px radius, subtle radial product-glow at the bottom-left, 3.5-4.5% white
  overlay, hairline `--border`
- Buttons: 8-12px radius, gradient fill, no drop shadows on text
- Product art: drop-shadow(-10px 14px 12px rgba(0,0,0,.35)), slight lift on hover
- Motion: 0.2s ease transitions only; no bounce, no parallax, no autoplay UI animation

## Voice

Confident, playful, direct, producer-to-producer. Short punchy sentences. No corporate
language. Message order: 1) show or hear the job the plugin solves, 2) show the real interface
or a real A/B moment, 3) explain the one-time price and ownership, 4) one relevant CTA.

## Hard rules (these override any styling request)

- Plain ASCII in anything that ships: straight quotes, regular hyphens, three periods. No em
  dashes, curly quotes, ellipsis characters, arrows, or invisible Unicode.
- Never name competitor products or trademarks in marketing copy. Use neutral technical
  language for what a plugin does.
- Do not claim: all six plugins have Windows support, AAX on Windows, universal AAX,
  endorsements or testimonials not on the page, or any customer count.
- Prices and offers come from the current product-marketing-context.md, never from memory.
- Real UI, real audio, official formats only. No fake UI animation, no AI actors.
- Still is free and the Still download is never gated behind an upsell.

## Applying the brand to non-web artifacts

- Slides / docs: `#0d0a1a` background, white headings in Inter 800, body `#a09bb5`, one
  accent per slide drawn from the product being discussed, JetBrains Mono for numbers.
- Email (Resend): dark background is fine but keep a light fallback; orange CTA button
  `#ff6b2b` with white text; footer text `#6b6580`.
- Social / ad creative: product accent as the dominant color, brand gradient for the
  headline only, product screenshot from the repo, no stock imagery.
