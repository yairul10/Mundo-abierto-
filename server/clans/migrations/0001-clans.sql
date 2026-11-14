-- Additive migration. Normal and test memberships are independent.
CREATE TABLE IF NOT EXISTS clans (
 realm TEXT NOT NULL CHECK(realm IN ('normal','test')),
 id TEXT NOT NULL,
 name TEXT NOT NULL CHECK(length(name) BETWEEN 3 AND 24),
 name_key TEXT NOT NULL,
 tag TEXT NOT NULL CHECK(length(tag) BETWEEN 2 AND 5 AND tag NOT GLOB '*[^A-Z0-9]*'),
 description TEXT NOT NULL DEFAULT '' CHECK(length(description)<=240),
 admission TEXT NOT NULL DEFAULT 'request' CHECK(admission IN ('open','request','invite')),
 created_at INTEGER NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(realm,id), UNIQUE(realm,name_key), UNIQUE(realm,tag)
);
CREATE TABLE IF NOT EXISTS clan_members (
 realm TEXT NOT NULL, account_id TEXT NOT NULL, clan_id TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('leader','officer','member')),
 joined_at INTEGER NOT NULL,
 PRIMARY KEY(realm,account_id),
 FOREIGN KEY(realm,clan_id) REFERENCES clans(realm,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS clan_member_list ON clan_members(realm,clan_id,joined_at);
CREATE UNIQUE INDEX IF NOT EXISTS clan_one_leader ON clan_members(realm,clan_id) WHERE role='leader';
CREATE TRIGGER IF NOT EXISTS clan_capacity_insert BEFORE INSERT ON clan_members
 WHEN (SELECT count(*) FROM clan_members WHERE realm=NEW.realm AND clan_id=NEW.clan_id)>=20
 BEGIN SELECT RAISE(ABORT,'clan_full'); END;
CREATE TRIGGER IF NOT EXISTS clan_capacity_move BEFORE UPDATE OF realm,clan_id ON clan_members
 WHEN (OLD.realm<>NEW.realm OR OLD.clan_id<>NEW.clan_id) AND
 (SELECT count(*) FROM clan_members WHERE realm=NEW.realm AND clan_id=NEW.clan_id)>=20
 BEGIN SELECT RAISE(ABORT,'clan_full'); END;
CREATE TABLE IF NOT EXISTS clan_requests (
 realm TEXT NOT NULL, clan_id TEXT NOT NULL, account_id TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(realm,clan_id,account_id),
 FOREIGN KEY(realm,clan_id) REFERENCES clans(realm,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS clan_requests_account ON clan_requests(realm,account_id);
CREATE TABLE IF NOT EXISTS clan_invitations (
 realm TEXT NOT NULL, clan_id TEXT NOT NULL, account_id TEXT NOT NULL, invited_by TEXT NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK(expires_at>created_at),
 PRIMARY KEY(realm,clan_id,account_id),
 FOREIGN KEY(realm,clan_id) REFERENCES clans(realm,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS clan_invites_account ON clan_invitations(realm,account_id,expires_at);
-- Reserved for the later server-validated debit/create transaction. Never client receipts.
CREATE TABLE IF NOT EXISTS clan_creation_receipts (
 realm TEXT NOT NULL CHECK(realm IN ('normal','test')), operation_id TEXT NOT NULL,
 account_id TEXT NOT NULL, clan_id TEXT NOT NULL, cost INTEGER NOT NULL CHECK(cost=200000),
 created_at INTEGER NOT NULL, PRIMARY KEY(realm,operation_id), UNIQUE(realm,clan_id)
);
