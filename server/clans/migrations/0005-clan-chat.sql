-- Private history, deleted with its clan. No client-supplied membership is trusted.
CREATE TABLE IF NOT EXISTS clan_chat_messages (
 realm TEXT NOT NULL, clan_id TEXT NOT NULL, id TEXT NOT NULL,
 author TEXT NOT NULL, text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 240),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(realm,clan_id,id),
 FOREIGN KEY(realm,clan_id) REFERENCES clans(realm,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS clan_chat_history ON clan_chat_messages(realm,clan_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS clan_chat_author ON clan_chat_messages(realm,author,created_at DESC);
-- Deleted text is replaced, keeping the rate limit and retry receipt intact.
