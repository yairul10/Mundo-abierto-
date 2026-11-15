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

The public tables require no additional bindings. The ranked ArenaLobby adds a
read-only `hallRanking` RPC method. The administrator audit uses the additive
level-history migration documented below.

Validation: `node --test tests/hall-of-fame*.test.mjs` and
`node server/hall-of-fame/runtime-test.mjs` with the existing Miniflare test runtime.

## Level-change audit (administrator)

Apply `migrations/0001-level-history.sql` to the identity/CLANS_DB database before
exposing the audit panel. Its additive table and SQLite triggers observe verified
normal cloud saves directly, so failed/rolled-back saves cannot leave false events.
The current save becomes a `baseline`; no prior history is invented. New saves
and every subsequent level/type change append records, including invalid values.
XP-only, wallet and equipment updates do not create duplicate level entries.
Server timestamps, old/new level and XP, revision, and the previous cloud-save time
are retained. Only bounded level values are copied, never full save payloads.
Deleting an account cascades its history through the players foreign key.

`tab=audit` is restricted on every request to the existing CHAT_ADMIN_IDS allowlist
(using the same verified-account/hashed-pilot matching as clan war administration).
Client admin flags are ignored. Other Hall responses expose only whether the
current viewer is an administrator. The audit works only in the normal realm.
The UI supports name search, account drilldown, optional warning filters and cursor
pagination. Other players cannot query the audit, even by guessing account IDs.

Initial review criteria (not proof of cheating): a gain of at least 10 levels in
one save; at least 5 within 5 minutes since the previous save from level 30 onward;
level decreases; or values outside the supported integer level range. Offline play,
restored progress and legitimate progression can trigger notices. No automatic
ban, rollback, rank penalty or message is sent. Thresholds are in `LEVEL_REVIEW`.

Additional checks: `node --test tests/level-audit*.test.mjs` and the Hall runtime
suite, including D1 triggers, migration replay, own/admin authorization and history.
