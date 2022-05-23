--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------

-- Add Guesses table
CREATE TABLE IF NOT EXISTS Guesses (
    guessId     INTEGER NOT NULL PRIMARY KEY,
    authorId    INTEGER NOT NULL,
    episodeId   INTEGER,
    
    -- TYPES:
    -- TWEET: 0
    -- TWITTER_DM: 1
    -- EMAIL: 2
    -- DISCORD: 3
    type            INTEGER NOT NULL CHECK(type BETWEEN 0 AND 3),
    text            TEXT    NOT NULL,
    
    correct         BOOLEAN NOT NULL DEFAULT FALSE,
    bonusPoint      BOOLEAN NOT NULL DEFAULT FALSE CHECK(CASE WHEN bonusPoint THEN correct END),
    
    tweetId         TEXT    UNIQUE CHECK(CASE WHEN tweetId NOT NULL THEN type IN (0, 1) END),
    discordReplyId  TEXT    UNIQUE CHECK(CASE WHEN discordReplyId NOT NULL THEN type IS 3 END),
    
    created_at      TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
    updated_at      TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
    
    FOREIGN KEY (authorId)
        REFERENCES Authors (authorId)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (episodeId)
        REFERENCES Episodes (episodeId)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE TRIGGER guess_updated_at
    AFTER UPDATE ON Guesses
BEGIN
    UPDATE Guesses
    SET updated_at = DATETIME('now', 'localtime')
    WHERE guessId = NEW.guessId;
END;

-- Update Authors table to support additional identifiers.
-- ALTER TABLE does not allow adding UNIQUE constraints, so we do it the hard way...
PRAGMA foreign_keys=off;
CREATE TABLE AuthorsAddColumns (
    authorId        INTEGER PRIMARY KEY,
    
    discordId       INTEGER NOT NULL UNIQUE,
    username        TEXT,
    displayName     TEXT,
    
    twitterId            TEXT UNIQUE, -- Anvil import: audience['twitter_user_id']
    twitterUsername      TEXT UNIQUE, -- Anvil import: audience['twitter_screen_name']
    twitterDisplayName   TEXT,        -- Not imported from Anvil
    emailAddress         TEXT UNIQUE, -- Anvil import: audience['email']
    emailName            TEXT,        -- Not imported from Anvil
    callsign             TEXT,        -- Anvil import: audience['nickname']
    notes                TEXT,        -- Anvil import: audience['notes']
    
    created_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime')),
    updated_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime'))
);
INSERT INTO AuthorsAddColumns (authorId, discordId, username, displayName, created_at, updated_at)
        SELECT authorId, discordId, username, displayName, created_at, updated_at
        FROM Authors;
    DROP TABLE Authors;
    ALTER TABLE AuthorsAddColumns RENAME TO Authors;
PRAGMA foreign_keys=on;



--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------

-- Drop Guesses table
DROP TABLE IF EXISTS Guesses;
DROP TRIGGER IF EXISTS guess_updated_at;

-- Drop identifiers from Authors
PRAGMA foreign_keys=off;
CREATE TABLE AuthorsDeleteColumns (
    authorId        INTEGER PRIMARY KEY,
    
    discordId       INTEGER NOT NULL UNIQUE,
    username        TEXT,
    displayName     TEXT,
    
    created_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime')),
    updated_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime')),
);
INSERT INTO AuthorsDeleteColumns (authorId, discordId, username, displayName, created_at, updated_at)
    SELECT authorId, discordId, username, displayName, created_at, updated_at
    FROM Authors;
DROP TABLE Authors;
ALTER TABLE AuthorsDeleteColumns RENAME TO Authors;
PRAGMA foreign_keys=on;
