-- Additive schema for operator-authorized account unlocks. No player save is replaced.
CREATE TABLE IF NOT EXISTS account_ship_grants (
 player_id TEXT NOT NULL REFERENCES players(id),
 ship_id TEXT NOT NULL,
 reason TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(player_id,ship_id)
);
