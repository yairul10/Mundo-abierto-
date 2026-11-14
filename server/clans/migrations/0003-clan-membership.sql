CREATE TRIGGER IF NOT EXISTS clan_request_limit BEFORE INSERT ON clan_requests
 WHEN (SELECT count(*) FROM clan_requests WHERE realm=NEW.realm AND account_id=NEW.account_id)>=5
 BEGIN SELECT RAISE(ABORT,'clan_request_limit'); END;
CREATE TRIGGER IF NOT EXISTS clan_invitation_limit BEFORE INSERT ON clan_invitations
 WHEN (SELECT count(*) FROM clan_invitations WHERE realm=NEW.realm AND clan_id=NEW.clan_id)>=50
 BEGIN SELECT RAISE(ABORT,'clan_invitation_limit'); END;
CREATE TRIGGER IF NOT EXISTS clan_member_clear_pending AFTER INSERT ON clan_members
 BEGIN DELETE FROM clan_requests WHERE realm=NEW.realm AND account_id=NEW.account_id; DELETE FROM clan_invitations WHERE realm=NEW.realm AND account_id=NEW.account_id; END;
