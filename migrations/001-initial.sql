--------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------


CREATE TABLE Episodes (
  episode_id       INTEGER          PRIMARY KEY,
  ep_num           INTEGER NOT NULL,
  created_at       TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
  updated_at       TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime'))
);

CREATE TABLE Suggestions (
  suggestion_id    INTEGER          PRIMARY KEY,
  episode_id       INTEGER NOT NULL,
  author_id        INTEGER NOT NULL,

  suggestion       TEXT,
  message_id       INTEGER,
  jump_url         INTEGER,

  created_at       TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
  updated_at       TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),

  FOREIGN KEY (episode_id)
    REFERENCES Episodes (episode_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
  FOREIGN KEY (author_id)
    REFERENCES Authors (author_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE TABLE Authors (
  author_id        INTEGER          PRIMARY KEY,
  discord_id       INTEGER NOT NULL,
  name             TEXT,
  nick             TEXT,
  created_at       TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime')),
  updated_at       TEXT    NOT NULL DEFAULT (DATETIME('now', 'localtime'))
);


--------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------

DROP TABLE Episodes;
DROP TABLE Suggestions;
DROP TABLE Authors;
