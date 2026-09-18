# Weekly run - scheduled task spec (NOT CREATED YET)

Creating it was blocked by this session's auto-mode permission classifier
("Cowork Scheduled Task Write"). Nothing is scheduled. To create it, tell Claude
to set it up in a session where scheduled-task writes are allowed, and paste the
prompt below verbatim.

- Name: Content engine: weekly clip run
- Schedule: `0 14 * * 1` (UTC) = Mondays 10:00 ET
- Needs the Mac: yes (ffmpeg + this repo live there)
- Notifications: push + email

## Prompt

Weekly Carbonated Audio content engine run. Work in the connected folder
carbonator-website-seo on SODA's Mac (device_bash, $HOME/mnt/carbonator-website-seo).

1. Read project memory content_engine.md and content-engine/README.md before anything
   else. They define the clip format, the asset stock, and the automation rules.
2. Pick the next 3 clips. Prefer unrendered specs in content-engine/queue/. If fewer
   than 3 exist, write new specs from the problem map in content_engine.md, using only
   dry/wet render pairs and UI stills that actually exist in the repo (check with ls and
   ffprobe; never invent an asset path). Rotate products and source material so the feed
   is not the same template every week.
3. Render each: bash content-engine/render-ab.sh content-engine/queue/<slug>.json
4. Write content-engine/captions/<slug>.json with a caption for tiktok, instagram,
   youtube and threads, plus a first_comment. Rules, no exceptions: plain ASCII only
   (regular hyphens, straight quotes, three periods), never name a competitor product or
   trademark, no claims about Windows support or customer counts, and a different hook
   per platform so the posts are not near-duplicates.
5. If a Buffer connection or MCP is available, upload the renders where Buffer can fetch
   them by URL and create the posts as DRAFTS spread across the week. Do not publish
   automatically unless content_engine.md says SODA approved auto-posting.
6. Email mixedbysoda@gmail.com a short summary: clips rendered with paths, the captions,
   what was queued, and anything that failed or is missing. Plain ASCII.
7. Update content_engine.md with what ran and what assets are still missing.

Do not record, generate or fake any audio, plugin UI or screenshot. Everything in a clip
must be a real render or a real UI still from the repo. If the render script fails,
report the exact error instead of working around it.
