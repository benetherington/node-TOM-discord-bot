--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------

CREATE TRIGGER IF NOT EXISTS suggestion_updated_at
    AFTER UPDATE ON Suggestions
BEGIN
    UPDATE Suggestions
    SET updated_at = DATETIME('now', 'localtime')
    WHERE suggestionId = NEW.suggestionId;
END;


--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------

DROP TRIGGER IF EXISTS suggestion_updated_at;
