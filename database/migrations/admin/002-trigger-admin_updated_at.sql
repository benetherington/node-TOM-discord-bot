--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------

CREATE TRIGGER admin_updated_at
    AFTER UPDATE ON Administrators
BEGIN
    UPDATE Administrators
    SET updated_at = DATETIME('now', 'localtime')
    WHERE administratorId = NEW.administratorId;
END;


--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------

DROP TRIGGER admin_updated_at;
