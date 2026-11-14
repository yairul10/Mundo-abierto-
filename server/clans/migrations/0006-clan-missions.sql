-- Server-only cooperative receipts. No public endpoint accepts mission progress.
CREATE TABLE IF NOT EXISTS clan_mission_events (
 realm TEXT NOT NULL CHECK(realm IN ('normal','test')),
 event_id TEXT NOT NULL, account_id TEXT NOT NULL, clan_id TEXT NOT NULL,
 week INTEGER NOT NULL, kind TEXT NOT NULL, occurred_at INTEGER NOT NULL,
 PRIMARY KEY(realm,event_id,account_id),
 FOREIGN KEY(realm,clan_id) REFERENCES clans(realm,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS clan_missions_week ON clan_mission_events(realm,week,clan_id,kind,event_id);
CREATE INDEX IF NOT EXISTS clan_missions_contributors ON clan_mission_events(realm,week,clan_id,account_id);
