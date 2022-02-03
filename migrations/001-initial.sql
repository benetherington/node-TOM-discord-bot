--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------


CREATE TABLE Episodes (
    episodeId   INTEGER NOT NULL PRIMARY KEY,
    
    epNum       INTEGER NOT NULL UNIQUE,
    
    created_at  TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
    updated_at  TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime'))
);

CREATE TABLE Suggestions (
    suggestionId    INTEGER          PRIMARY KEY,
    episodeId       INTEGER NOT NULL,
    authorId        INTEGER NOT NULL,
    
    text          TEXT,
    token         INTEGER,
    
    created_at      TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
    updated_at      TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),

    FOREIGN KEY (episodeId)
        REFERENCES Episodes (episodeId)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    FOREIGN KEY (authorId)
        REFERENCES Authors (authorId)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE Authors (
    authorId        INTEGER PRIMARY KEY,
    discordId       INTEGER NOT NULL UNIQUE,
    
    username        TEXT,
    displayName     TEXT,
    
    created_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime')),
    updated_at      TEXT    NOT NULL    DEFAULT (DATETIME('now', 'localtime'))
);

CREATE TABLE Suggestion_Voters (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    
    suggestionId    INTEGER NOT NULL,
    authorId        INTEGER NOT NULL,
    
    UNIQUE(suggestionId, authorId)
    FOREIGN KEY (suggestionId)
        REFERENCES Suggestions (suggestionId)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    FOREIGN KEY (authorId)
        REFERENCES Authors (authorId)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------

DROP TABLE Episodes;
DROP TABLE Suggestions;
DROP TABLE Authors;
DROP Table Suggestion_Voters;
