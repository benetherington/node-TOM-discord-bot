--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------

ALTER TABLE Episodes
ADD COLUMN toDo TEXT;

--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------

-- Drop toDo from Episodes
PRAGMA foreign_keys=off;
CREATE TABLE EpisodesDeleteColumns (
    episodeId   INTEGER NOT NULL PRIMARY KEY,
    
    epNum       INTEGER NOT NULL UNIQUE,
    
    created_at  TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
    updated_at  TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime'))
);
INSERT INTO EpisodesDeleteColumns (
    episodeId,
    epNum,
    created_at,
    updated_at
)
SELECT
    episodeId,
    epNum,
    created_at,
    updated_at
FROM Authors;

DROP TABLE Authors;
ALTER TABLE AuthorsDeleteColumns RENAME TO Authors;
PRAGMA foreign_keys=on;
