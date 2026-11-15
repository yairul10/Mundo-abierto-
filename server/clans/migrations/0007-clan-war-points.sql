CREATE TABLE IF NOT EXISTS clan_war_points (
 realm TEXT NOT NULL CHECK(realm IN ('normal','test')),
 event_id TEXT NOT NULL, match_code TEXT NOT NULL, clan_id TEXT NOT NULL,
 week INTEGER NOT NULL, points INTEGER NOT NULL CHECK(points=100), finished_at INTEGER NOT NULL,
 PRIMARY KEY(realm,event_id,match_code),
 FOREIGN KEY(realm,clan_id) REFERENCES clans(realm,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS clan_war_points_week ON clan_war_points(realm,week,clan_id);
