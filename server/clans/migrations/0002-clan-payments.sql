-- Receipts and the cloud-save debit commit in the same D1 transaction as clan creation.
CREATE TABLE IF NOT EXISTS clan_creation_payments (
 realm TEXT NOT NULL CHECK(realm='normal'), operation_id TEXT NOT NULL,
 account_id TEXT NOT NULL, expected_revision INTEGER NOT NULL CHECK(expected_revision>=0),
 PRIMARY KEY(realm,operation_id)
);
CREATE TRIGGER IF NOT EXISTS clan_payment_validate BEFORE INSERT ON clan_creation_payments
 BEGIN SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM player_saves WHERE player_id=NEW.account_id AND revision=NEW.expected_revision) THEN RAISE(ABORT,'clan_revision_conflict') END; SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM player_saves WHERE player_id=NEW.account_id AND json_valid(payload) AND json_type(payload,'$.gold') IN ('integer','real') AND json_extract(payload,'$.gold')>=200000) THEN RAISE(ABORT,'clan_insufficient_credits') END; END;
CREATE TRIGGER IF NOT EXISTS clan_payment_debit AFTER INSERT ON clan_creation_payments
 BEGIN UPDATE player_saves SET payload=json_set(payload,'$.gold',json_extract(payload,'$.gold')-200000,'$.clanPurchases',json_patch(COALESCE(json_extract(payload,'$.clanPurchases'),'{}'),json_object(NEW.operation_id,1))),revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE player_id=NEW.account_id; END;
