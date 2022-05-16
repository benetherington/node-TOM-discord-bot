--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------

-- Add Guesses table
CREATE TABLE Guesses (
    guessId     INTEGER NOT NULL PRIMARY KEY,
    authorId    INTEGER NOT NULL
    
    type            INTEGER NOT NULL,
                        CHECK(type>=0 AND type<=3)
    text            TEXT    NOT NULL,
    tweetId         TEXT    UNIQUE,
    discordReplyId  TEXT    UNIQUE,
    
    created_at      TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
    updated_at      TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime'))
    
    FOREIGN KEY (authorId)
        REFERENCES Authors (authorId)
        ON UPDATE CASCADE
        ON DELETE CASCADE
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
BEGIN TRANSACTION;
    CREATE TABLE AuthorsAddColumns (
        authorId        INTEGER PRIMARY KEY,
        
        discordId       INTEGER NOT NULL UNIQUE,
        username        TEXT,
        displayName     TEXT,
        
        twitterId            TEXT UNIQUE, -- Anvil import: audience['twitter_user_id']
        twitterDisplayName   TEXT,        -- Not imported from Anvil
        twitterUsername      TEXT UNIQUE, -- Anvil import: audience['twitter_screen_name']
        emailAddress         TEXT UNIQUE, -- Anvil import: audience['email']
        emailName            TEXT,        -- Not imported from Anvil
        callsign             TEXT,        -- Anvil import: audience['nickname']
        notes                TEXT,        -- Anvil import: audience['notes']
        
        created_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime')),
        updated_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime'))
    );
    INSERT INTO AuthorsAddColumns
        SELECT authorId, discordId, username, displayName, created_at, updated_at
        FROM Authors;
    DROP TABLE Authors;
    ALTER TABLE AuthorsAddColumns RENAME TO Authors;
COMMIT;
PRAGMA foreign_keys=on;



--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------

-- Drop Guesses table
DROP TABLE Guesses;
DROP TRIGGER guess_updated_at;

-- Drop identifiers from Authors
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;
    CREATE TABLE AuthorsDeleteColumns (
        authorId        INTEGER PRIMARY KEY,
        
        discordId       INTEGER NOT NULL UNIQUE,
        username        TEXT,
        displayName     TEXT,
        
        created_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime')),
        updated_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime'))
    );
    INSERT INTO AuthorsDeleteColumns
        SELECT authorId, discordId, username, displayName, created_at, updated_at
        FROM Authors;
    DROP TABLE Authors;
    ALTER TABLE AuthorsDeleteColumns RENAME TO Authors;
COMMIT;
PRAGMA foreign_keys=on;
