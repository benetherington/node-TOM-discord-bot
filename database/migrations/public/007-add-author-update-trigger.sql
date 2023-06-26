--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------
CREATE TRIGGER author_updated_at
    AFTER UPDATE ON Authors
BEGIN
    UPDATE Authors
    SET updated_at = DATETIME('now', 'localtime')
    WHERE authorId = NEW.authorId;
END;

--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------
DROP TRIGGER IF EXISTS author_updated_at