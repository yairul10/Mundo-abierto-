# Public PvP matchmaking

All public modes use `/ranked/action`, authenticated by Google Play. A party code
admits up to five consenting accounts before queuing. Only its leader queues or
cancels. Team packing never splits a party; 1v1/Arena 20 require solo entry, 2v2
allows two and 5v5 five. An inactive party member cancels its queue after 25 seconds.

Players remain on their existing map. A queue waits up to 120 seconds, starts
earlier when enough real players are available, then assigns a 10-second travel
notice. The server authorizes each account and slot. It waits up to 35 additional
seconds for travel; missing slots receive bots. No humans arriving means no match
or points. Bots use bounded randomized ship profiles, upgrades, equipment, skills
and names, with no visible bot suffix. Their identity remains explicit internally.

Ranked arenas use real rounds/combat, including after a human dies. 1v1 is best
of three; team modes are elimination and Arena 20 records final places. Leaving
Arena 20 never terminates everybody else's match. An alive player abandoning or
failing to reconnect forfeits their points; eliminated players may leave and retain
place/team eligibility. Time-limit survivors share the lowest occupied survivor
place; simultaneous deaths share the next available place.

Wins grant 50 points in team/duel modes. Arena 20 grants 50 to its winner, then
18 for second down to 1 for nineteenth, zero for twentieth. No points for practice,
private games, cancelled matches or absent participants. The existing positional
rank badges use the new global points standings. Prior cooperative kill statistics
remain separate.

The existing ArenaLobby namespace hosts `ranked-directory-normal` and `-test`.
Its SQLite stores queues, parties, scores and unique per-match/account receipts;
no new bindings or D1 migrations are required. Assignments persist before arena
RPC, and settlement is transactional/idempotent. An alarm handles queue deadlines
and eventual points settlement even after all humans leave. Practice/private and
clan war entry points remain separate.

Checks:
- `node --test tests/ranked-matchmaking*.test.mjs`
- `node server/matchmaking/runtime-test.mjs` (project Miniflare dependency)
