--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------

-- Update Guesses table to add Mastodon attribute and alter type validity
PRAGMA foreign_keys=off;
CREATE TABLE GuessesAddMastodon (
    guessId     INTEGER NOT NULL PRIMARY KEY,
    authorId    INTEGER NOT NULL,
    episodeId   INTEGER,
    
    -- TYPES:
    -- TWEET: 0
    -- TWITTER_DM: 1
    -- EMAIL: 2
    -- DISCORD: 3
    -- TOOT: 4 New!
    type            INTEGER NOT NULL CHECK(type BETWEEN 0 AND 4),
    text            TEXT    NOT NULL,
    
    correct         BOOLEAN NOT NULL DEFAULT FALSE,
    bonusPoint      BOOLEAN NOT NULL DEFAULT FALSE CHECK(CASE WHEN bonusPoint THEN correct END),
    
    tweetId         TEXT    UNIQUE CHECK(CASE WHEN tweetId NOT NULL THEN type IN (0, 1) END),
    discordReplyId  TEXT    UNIQUE CHECK(CASE WHEN discordReplyId NOT NULL THEN type IS 3 END),
    tootId          TEXT    UNIQUE CHECK(CASE WHEN tootId NOT NULL THEN type IS 4 END), -- New!
    
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
INSERT INTO GuessesAddMastodon (guessId, authorId, episodeId,
                                type, text, correct,
                                bonusPoint, tweetId, discordReplyId,
                                created_at, updated_at)
    SELECT guessId, authorId, episodeId,
           type, text, correct,
           bonusPoint, tweetId, discordReplyId,
           created_at, updated_at
    FROM Guesses;
DROP TABLE Guesses;
ALTER TABLE GuessesAddMastodon RENAME TO Guesses;
-- Existing trigger guess_updated_at will now refer to this new table
PRAGMA foreign_keys=on;


-- Update Authors table to add Mastodon attributes.
-- UNIQUE constraints can't be added using ALTER TABLE
PRAGMA foreign_keys=off;
CREATE TABLE AuthorsAddMastodon (
    authorId        INTEGER PRIMARY KEY,
    
    discordId       INTEGER UNIQUE,
    username        TEXT,
    displayName     TEXT,
    
    twitterId            TEXT UNIQUE,
    twitterUsername      TEXT UNIQUE,
    twitterDisplayName   TEXT,
    
    emailAddress         TEXT UNIQUE,
    emailName            TEXT,
    
    mastodonId           TEXT,
    mastodonUsername     TEXT UNIQUE,
    mastodonDisplayName  TEXT,
    
    callsign             TEXT,
    notes                TEXT,
    
    created_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime')),
    updated_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime'))
);

INSERT INTO AuthorsAddMastodon (authorId, discordId, username,
                                displayName, twitterId, twitterUsername,
                                twitterDisplayName, emailAddress, emailName,
                                callsign, notes, created_at, updated_at)
    SELECT authorId, discordId, username,
           displayName, twitterId, twitterUsername,
           twitterDisplayName, emailAddress, emailName,
           callsign, notes, created_at, updated_at
    FROM Authors;
DROP TABLE Authors;
ALTER TABLE AuthorsAddMastodon RENAME TO Authors;
-- There's no trigger for updating authors, so we'll add that in a following migration.
PRAGMA foreign_keys=on;





--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------
-- Update Guesses table to remove Mastodon attribute and alter type validity
PRAGMA foreign_keys=off;
CREATE TABLE GuessesDeleteMastodon (
    guessId     INTEGER NOT NULL PRIMARY KEY,
    authorId    INTEGER NOT NULL,
    episodeId   INTEGER,
    
    type            INTEGER NOT NULL CHECK(type BETWEEN 0 AND 3), -- Undone
    text            TEXT    NOT NULL,
    
    correct         BOOLEAN NOT NULL DEFAULT FALSE,
    bonusPoint      BOOLEAN NOT NULL DEFAULT FALSE CHECK(CASE WHEN bonusPoint THEN correct END),
    
    tweetId         TEXT    UNIQUE CHECK(CASE WHEN tweetId NOT NULL THEN type IN (0, 1) END),
    discordReplyId  TEXT    UNIQUE CHECK(CASE WHEN discordReplyId NOT NULL THEN type IS 3 END),
    -- Here would be tootId
    
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
INSERT INTO GuessesDeleteMastodon (guessId, authorId, episodeId,
                                type, text, correct,
                                bonusPoint, tweetId, discordReplyId,
                                created_at, updated_at)
    SELECT guessId, authorId, episodeId,
           type, text, correct,
           bonusPoint, tweetId, discordReplyId,
           created_at, updated_at
    FROM Guesses;
DROP TABLE Guesses;
ALTER TABLE GuessesDeleteMastodon RENAME TO Guesses;
PRAGMA foreign_keys=on;

-- Update Authors table to remove Mastodon attributes.
PRAGMA foreign_keys=off;
CREATE TABLE AuthorsRemoveMastodon (
    authorId        INTEGER PRIMARY KEY,
    
    discordId       INTEGER UNIQUE,
    username        TEXT,
    displayName     TEXT,
    
    twitterId            TEXT UNIQUE,
    twitterUsername      TEXT UNIQUE,
    twitterDisplayName   TEXT,
    
    emailAddress         TEXT UNIQUE,
    emailName            TEXT,
    
    -- Here would have been the three Mastodon columns
    
    callsign             TEXT,
    notes                TEXT,
    
    created_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime')),
    updated_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime'))
);

INSERT INTO AuthorsRemoveMastodon (authorId, discordId, username,
                                   displayName, twitterId, twitterUsername,
                                   twitterDisplayName, emailAddress, emailName,
                                   callsign, notes, created_at, updated_at)
    SELECT authorId, discordId, username,
           displayName, twitterId, twitterUsername,
           twitterDisplayName, emailAddress, emailName,
           callsign, notes, created_at, updated_at
    FROM Authors;
DROP TABLE Authors;
ALTER TABLE AuthorsRemoveMastodon RENAME TO Authors;
-- There's no trigger for updating authors, so we'll add that in a following migration.
PRAGMA foreign_keys=on;
