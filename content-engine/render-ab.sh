#!/usr/bin/env bash
# render-ab.sh - build one vertical A/B proof clip from real audio + a real UI shot.
# No camera, no editor. Everything here is ffmpeg on assets that already exist in the repo.
#
# usage: render-ab.sh <spec.json>
# spec keys: slug, product, accent, shot, dry, wet, hook, line_dry, line_wet, cta, seg (seconds)
set -euo pipefail
cd "$(dirname "$0")/.."          # repo root
SPEC="$1"
j(){ python3 -c "import json,sys;print(json.load(open('$SPEC'))['$1'])"; }

SLUG=$(j slug); PRODUCT=$(j product); ACCENT=$(j accent)
SHOT=$(j shot); DRY=$(j dry); WET=$(j wet)
HOOK=$(j hook); LDRY=$(j line_dry); LWET=$(j line_wet); CTA=$(j cta)
SEG=$(j seg); START=$(j start)
OUT="content-engine/out/${SLUG}.mp4"
FONT=${FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf}
MONO=${MONO:-/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf}

# audio timeline: dry, wet, dry, wet  (same bars each time, so the only variable is the plugin)
S2=$((SEG*2)); S3=$((SEG*3)); S4=$((SEG*4))

ffmpeg -y -loglevel error \
  -loop 1 -i "$SHOT" -i "$DRY" -i "$WET" \
  -filter_complex "
   [1:a]atrim=${START}:$((START+SEG)),asetpts=N/SR/TB[d1];
   [2:a]atrim=${START}:$((START+SEG)),asetpts=N/SR/TB[w1];
   [1:a]atrim=$((START+SEG)):$((START+S2)),asetpts=N/SR/TB[d2];
   [2:a]atrim=$((START+SEG)):$((START+S2)),asetpts=N/SR/TB[w2];
   [d1][w1][d2][w2]concat=n=4:v=0:a=1[aud];
   [aud]asplit=2[aout][avis];
   [avis]showwaves=s=1000x260:mode=cline:rate=30:colors=${ACCENT}[wav];
   color=c=0x0d0a1a:s=1080x1920:r=30:d=${S4}[bg];
   [0:v]scale=740:950:force_original_aspect_ratio=decrease[shot];
   [bg][shot]overlay=(W-w)/2:300+(950-h)/2[v1];
   [v1][wav]overlay=40:1330[v2];
   [v2]drawtext=fontfile=${FONT}:text='${HOOK}':fontcolor=white:fontsize=72:x=(w-tw)/2:y=150:line_spacing=14,
      drawtext=fontfile=${MONO}:text='${LDRY}':fontcolor=0x6b6580:fontsize=54:x=(w-tw)/2:y=1640:enable='between(t,0,${SEG})+between(t,${S2},${S3})',
      drawtext=fontfile=${MONO}:text='${LWET}':fontcolor=${ACCENT}:fontsize=54:x=(w-tw)/2:y=1640:enable='between(t,${SEG},${S2})+between(t,${S3},${S4})',
      drawtext=fontfile=${MONO}:text='${CTA}':fontcolor=0xa09bb5:fontsize=40:x=(w-tw)/2:y=1780[vout]" \
  -map "[vout]" -map "[aout]" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -movflags +faststart -t ${S4} "$OUT"

echo "$OUT"
ffprobe -v quiet -show_entries format=duration,size -of default=nw=1 "$OUT"
