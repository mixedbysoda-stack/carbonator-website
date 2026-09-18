# content-engine

Hands-off clip factory for Carbonated Audio. Nothing here needs a camera, an editor,
or SODA at a keyboard. A scheduled Cowork session runs it start to finish.

## What a clip is

A vertical 1080x1920 A/B proof: real plugin UI still, the real dry render, the real
wet render, the same bars twice, waveform drawn from the audio that is playing, big
labels. The audio is the content, so there is no voiceover and nothing synthetic in
the frame. That keeps it inside the brand rules (real UI, real audio, no AI actors)
and outside every platform's AI-disclosure requirement.

## Run one clip

    bash content-engine/render-ab.sh content-engine/queue/<slug>.json

Renders to `content-engine/out/<slug>.mp4` in about 7 seconds on the Cowork VM.
ffmpeg only. No network.

## Spec fields (queue/*.json)

| key | meaning |
|-----|---------|
| slug | output filename and the /learn page it points at |
| product | product name, for captions |
| accent | ffmpeg colour, the product accent (0xf59e0b Carbonator, 0x22d3ee De-Sipper, 0x60a5fa On Tap, 0xa78bfa Pour, 0xe879f9 FIZZFUEL, 0x6fc7bc Still) |
| shot | plugin UI still, repo-relative |
| dry / wet | the two renders of the SAME source material |
| hook | line burned across the top, keep it under 30 characters per line |
| line_dry / line_wet | the toggling state labels |
| seg | seconds per segment. Timeline is dry, wet, dry, wet, so 4 = a 16s clip |
| start | offset into the source audio, so the clip starts at a good bar |

## Asset stock (what exists today)

- Carbonator: audio/dry.mp3 + 5 flavour renders (cola, cherry, lemon-lime, orange-cream, grape)
- TALLBOY: assets/tallboy-demos, clean + processed for vocal, drums, synth
- FIZZFUEL: assets/fizzfuel-demos, clean + processed for vocal, drums, synth, transition
- UI stills: <product>-screenshot.png in the repo root

That is 12+ clips of stock with zero new recording. MISSING: dry/wet pairs for
De-Sipper, On Tap, Pour and Still. One batch render of those in the DAW unlocks the
rest of the matrix.

## Known limits

- Fonts on the VM are DejaVu, not Inter/JetBrains Mono. Install the brand fonts on the
  Mac and set FONT= / MONO= to match the site.
- Plugin stills are small (Carbonator is 451x588). Recapture at 2x for crisper upscales.
- Waveform is `showwaves cline`. Fine on a still layout, not a substitute for a real
  screen capture when the video is about moving a control.

## Weekly automated run (what the scheduled session does)

1. Pick the next unrendered spec in queue/ (or write a new one from the topic list).
2. Render it. Render 3 to 5 if the week needs a batch.
3. Write captions/<slug>.json, one caption per platform, ASCII only, no competitor names.
4. Build /learn/<slug> on the site from the same material, deploy.
5. Upload the mp4s somewhere Buffer can fetch by URL, queue the posts across the week.
6. Report back: what rendered, what got queued, what it could not do.
