--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------

-- Add chatThank to Authors
ALTER TABLE Authors
ADD COLUMN chatThank BOOLEAN DEFAULT FALSE;



--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------

-- Drop chatThank from Authors
PRAGMA foreign_keys=off;
CREATE TABLE AuthorsDeleteColumns (
    authorId        INTEGER PRIMARY KEY,
    
    discordId       INTEGER UNIQUE,
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
INSERT INTO AuthorsDeleteColumns (
        authorId,
        discordId,
        username,
        displayName,
        twitterId
        twitterUsername,
        twitterDisplayName,
        emailAddress,
        emailName,
        callsign,
        notes,
        created_at,
        updated_at
    )
    SELECT
        authorId,
        discordId,
        username,
        displayName,
        twitterId
        twitterUsername,
        twitterDisplayName,
        emailAddress,
        emailName,
        callsign,
        notes,
        created_at,
        updated_at
    FROM Authors;
DROP TABLE Authors;
ALTER TABLE AuthorsDeleteColumns RENAME TO Authors;
PRAGMA foreign_keys=on;
