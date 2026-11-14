-- Keep action receipts after dissolution so a retry never repeats a destructive action.
CREATE TABLE IF NOT EXISTS clan_admin_actions (
 realm TEXT NOT NULL CHECK(realm IN ('normal','test')), operation_id TEXT NOT NULL,
 clan_id TEXT NOT NULL, actor_id TEXT NOT NULL, target_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('promote','demote','kick','transfer','disband')),
 created_at INTEGER NOT NULL, PRIMARY KEY(realm,operation_id)
);
CREATE TRIGGER IF NOT EXISTS clan_admin_validate BEFORE INSERT ON clan_admin_actions
 BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM clan_members a WHERE a.realm=NEW.realm AND a.clan_id=NEW.clan_id AND a.account_id=NEW.actor_id AND (a.role='leader' OR NEW.action='kick' AND a.role='officer')) THEN RAISE(ABORT,'clan_forbidden') END;
 SELECT CASE WHEN NEW.action<>'disband' AND (NEW.actor_id=NEW.target_id OR NOT EXISTS(SELECT 1 FROM clan_members t WHERE t.realm=NEW.realm AND t.clan_id=NEW.clan_id AND t.account_id=NEW.target_id AND t.role<>'leader')) THEN RAISE(ABORT,'clan_target_unavailable') END;
 SELECT CASE WHEN NEW.action='promote' AND NOT EXISTS(SELECT 1 FROM clan_members t WHERE t.realm=NEW.realm AND t.clan_id=NEW.clan_id AND t.account_id=NEW.target_id AND t.role='member') THEN RAISE(ABORT,'clan_role_changed') END;
 SELECT CASE WHEN NEW.action='demote' AND NOT EXISTS(SELECT 1 FROM clan_members t WHERE t.realm=NEW.realm AND t.clan_id=NEW.clan_id AND t.account_id=NEW.target_id AND t.role='officer') THEN RAISE(ABORT,'clan_role_changed') END;
 SELECT CASE WHEN NEW.action='kick' AND EXISTS(SELECT 1 FROM clan_members a JOIN clan_members t ON t.realm=a.realm AND t.clan_id=a.clan_id WHERE a.realm=NEW.realm AND a.clan_id=NEW.clan_id AND a.account_id=NEW.actor_id AND a.role='officer' AND t.account_id=NEW.target_id AND t.role<>'member') THEN RAISE(ABORT,'clan_forbidden') END;
 END;
CREATE TRIGGER IF NOT EXISTS clan_admin_apply AFTER INSERT ON clan_admin_actions
 BEGIN
 UPDATE clan_members SET role='officer' WHERE NEW.action='transfer' AND realm=NEW.realm AND clan_id=NEW.clan_id AND account_id=NEW.actor_id;
 UPDATE clan_members SET role='leader' WHERE NEW.action='transfer' AND realm=NEW.realm AND clan_id=NEW.clan_id AND account_id=NEW.target_id;
 UPDATE clan_members SET role='officer' WHERE NEW.action='promote' AND realm=NEW.realm AND clan_id=NEW.clan_id AND account_id=NEW.target_id;
 UPDATE clan_members SET role='member' WHERE NEW.action='demote' AND realm=NEW.realm AND clan_id=NEW.clan_id AND account_id=NEW.target_id;
 DELETE FROM clan_members WHERE NEW.action='kick' AND realm=NEW.realm AND clan_id=NEW.clan_id AND account_id=NEW.target_id;
 DELETE FROM clan_invitations WHERE NEW.action IN ('kick','demote') AND realm=NEW.realm AND clan_id=NEW.clan_id AND invited_by=NEW.target_id;
 UPDATE clans SET revision=revision+1 WHERE realm=NEW.realm AND id=NEW.clan_id;
 DELETE FROM clans WHERE NEW.action='disband' AND realm=NEW.realm AND id=NEW.clan_id;
 END;
