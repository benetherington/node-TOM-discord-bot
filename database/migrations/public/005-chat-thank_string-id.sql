--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------

-- Add chatThank to Authors, use TEXT for discordId
PRAGMA foreign_keys=off;
CREATE TABLE AuthorsRetypeColumn (
    authorId            INTEGER PRIMARY KEY,
    
    callsign            TEXT,        -- Anvil import: audience['nickname']
    chatThank           BOOLEAN DEFAULT FALSE,
    notes               TEXT,        -- Anvil import: audience['notes']
    
    discordId           TEXT UNIQUE,
    username            TEXT,
    displayName         TEXT,
    
    twitterId           TEXT UNIQUE, -- Anvil import: audience['twitter_user_id']
    twitterUsername     TEXT UNIQUE, -- Anvil import: audience['twitter_screen_name']
    twitterDisplayName  TEXT,        -- Not imported from Anvil
    
    emailAddress        TEXT UNIQUE, -- Anvil import: audience['email']
    emailName           TEXT,        -- Not imported from Anvil
    
    created_at          TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
    updated_at          TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
);
INSERT INTO AuthorsRetypeColumn (
    authorId,
    callsign,
    notes,
    discordId,
    username,
    displayName,
    twitterId,
    twitterUsername,
    twitterDisplayName,
    emailAddress,
    emailName,
    created_at,
    updated_at
)
SELECT
    authorId,
    callsign,
    notes,
    discordId,
    username,
    displayName,
    twitterId,
    twitterUsername,
    twitterDisplayName,
    emailAddress,
    emailName,
    created_at,
    updated_at
FROM Authors;

DROP TABLE Authors;
ALTER TABLE AuthorsRetypeColumn RENAME TO Authors;
PRAGMA foreign_keys=on;

--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------

-- Drop chatThank from Authors, !!!DOES NOT retype discordId!!!
PRAGMA foreign_keys=off;
CREATE TABLE AuthorsDeleteColumns (
    authorId            INTEGER PRIMARY KEY,
    
    callsign            TEXT,        -- Anvil import: audience['nickname']
    notes               TEXT,        -- Anvil import: audience['notes']
    
    discordId           TEXT UNIQUE,
    username            TEXT,
    displayName         TEXT,
    
    twitterId           TEXT UNIQUE, -- Anvil import: audience['twitter_user_id']
    twitterUsername     TEXT UNIQUE, -- Anvil import: audience['twitter_screen_name']
    twitterDisplayName  TEXT,        -- Not imported from Anvil
    emailAddress        TEXT UNIQUE, -- Anvil import: audience['email']
    emailName           TEXT,        -- Not imported from Anvil
    
    created_at          TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
    updated_at          TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
);
INSERT INTO AuthorsDeleteColumns (
    authorId,
    callsign,
    notes,
    discordId,
    username,
    displayName,
    twitterId,
    twitterUsername,
    twitterDisplayName,
    emailAddress,
    emailName,
    created_at,
    updated_at
)
SELECT
    authorId,
    callsign,
    notes,
    discordId,
    username,
    displayName,
    twitterId,
    twitterUsername,
    twitterDisplayName,
    emailAddress,
    emailName,
    created_at,
    updated_at
FROM Authors;

DROP TABLE Authors;
ALTER TABLE AuthorsDeleteColumns RENAME TO Authors;
PRAGMA foreign_keys=on;
