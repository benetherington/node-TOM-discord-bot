--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------


CREATE TABLE Administrators (
    administratorId   INTEGER NOT NULL PRIMARY KEY,
    
    username          TEXT    NOT NULL UNIQUE,
    hashedPassword    TEXT    NOT NULL,
    
    created_at  TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
    updated_at  TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime'))
);

CREATE TABLE Administrator_Tokens (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    
    administratorId INTEGER NOT NULL,
    token           TEXT    NOT NULL,
    
    UNIQUE (administratorId, token)
    FOREIGN KEY (administratorId)
        REFERENCES Administrators (administratorId)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------

DROP TABLE Administrators;
DROP TABLE Administrator_Tokens;
