# Sala de la fama

`GET /hall-of-fame?tab=clans|ranks|levels&realm=normal|test` requires a verified
Google Play account and reads only the requested table. It uses an account-based
rate limit; opening the menu does not join, cancel or advance the matchmaking queue.

- Clans: existing top 50 for the current UTC week, including missions and wars.
- Ranks: top 100 with positive public-match points, existing rank badges and own
  position even when outside the top 100. Practice/private games remain excluded.
- Levels: top 100 from normal `player_saves` joined to verified `players` names.
  Order is level, XP, then account ID for deterministic ties. Only valid integer
  levels 1–10000 are included. Malformed saves are ignored; XP is bounded numeric.
  Own position is returned even outside the displayed top. These are synchronized
  cloud-save levels, not an independent server anti-cheat progression system.

Test clans and rank points remain separate. Test progress is local, so the levels
panel reports unavailable in that realm instead of showing normal saves as test.
Other players' account IDs and cloud payloads are never returned by the level/rank
panels. Names are rendered with textContent. Refresh is explicit; closing or
switching a tab cancels its read and late responses cannot replace the active view.

No new bindings or D1 migrations are required. The ranked ArenaLobby adds a
read-only `hallRanking` RPC method.

Validation: `node --test tests/hall-of-fame*.test.mjs` and
`node server/hall-of-fame/runtime-test.mjs` with the existing Miniflare test runtime.
