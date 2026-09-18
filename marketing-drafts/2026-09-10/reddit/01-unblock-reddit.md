# How to actually unblock Reddit visibility

Pick one. Either fixes this permanently; RSS-only is not a real fix, it's a 429 away from going
dark on any given day.

**Option A (fastest):** run `/mcp` in an interactive Claude Code session and authorize
`mcp-config-bc26yt` — it's already registered, it just needs the OAuth grant done once by a human
in front of a browser. This gives read access (GET/SEARCH/EDIT) immediately; posting still has to
be pasted manually regardless.

**Option B (more durable):** register a Reddit "script" app at reddit.com/prefs/apps, then set
`REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` so requests go against `oauth.reddit.com` instead of
the public endpoints — this is the route that isn't subject to the anonymous-traffic interstitial
or the RSS rate limit at all.

Either one turns "zero visibility" back into an actual search capability. Until one of them
happens, every run through this task is going to keep reporting the same gap.
