const sqlite3 = require('sqlite3').verbose();
const dbWrapper = require('sqlite');

const dbFile = require('path').resolve('./.data/title-suggestions.db');
const migrationsPath = './database/migrations/public';
let db;

/*---------*\
  UTILITIES
\*---------*/
const printDbSummary = async () => {
    try {
        const selectTables = await db.all(
            "SELECT name FROM sqlite_master WHERE type='table';",
        );
        const exists = selectTables.map((row) => row.name).join(', ');
        console.log(`Tables: ${exists}`);

        const guesses = await db.all(
            `SELECT type, text
            FROM Guesses
            ORDER BY guessId DESC
            LIMIT 10`,
        );
        if (guesses.length) {
            console.log('Most recent TWSF guesses:');
            console.table(guesses);
        } else {
            console.log('No TWSF guesses have been made yet.');
        }
    } catch (error) {
        console.error('There was an issue printing the TWSF db summary.');
        console.error(error);
    }
};

/*-------*\
  DB INIT
\*-------*/
const initDB = async () => {
    const public = require('./public');
    db = await public;
};
initDB().then(printDbSummary);

/*--------*\
  TYPE DEF
\*--------*/

const types = {
    TWEET: 0,
    TWITTER_DM: 1,
    EMAIL: 2,
    DISCORD: 3,
};
module.exports.guessTypes = types;

/*-------*\
  AUTHORS
\*-------*/
const getAuthorByGuessType = (guessType, author) => {
    if ([types.TWEET, types.TWITTER_DM].includes(guessType)) {
        return db.get(
            'SELECT * FROM Authors WHERE twitterId = ?;',
            author.twitterId,
        );
    } else if (guessType === types.EMAIL) {
        return db.get(
            'SELECT * FROM Authors WHERE emailAddress = ?;',
            author.emailAddress,
        );
    } else if (guessType === types.DISCORD) {
        return db.get(
            'SELECT * FROM Authors WHERE discordId = ?;',
            author.discordId,
        );
    }
};
const updateAuthorByGuessType = (guessType, author) => {
    if (guessType == types.TWEET || guessType == types.TWITTER_DM) {
        return db.run(
            `UPDATE Authors
                SET twitterId=?, twitterUsername=?, twitterDisplayName=?
                WHERE authorId = ?;`,
            author.twitterId,
            author.twitterUsername,
            author.twitterDisplayName,
            author.authorId,
        );
    } else if (guessType === types.EMAIL) {
        return db.run(
            `UPDATE Authors
                SET emailAddress=?, emailName=?
                WHERE authorId = ?;`,
            author.emailAddress,
            author.emailName,
            author.authorId,
        );
    } else if (guessType === types.DISCORD) {
        return db.run(
            `UPDATE Authors
                SET discordId=?, username=?, displayName=?
                WHERE authorId = ?;`,
            author.discordId,
            author.username,
            author.displayName,
            author.authorId,
        );
    }
};
const insertAuthorByGuessType = (guessType, author) => {
    if (guessType == types.TWEET || guessType == types.TWITTER_DM) {
        return db.run(
            `INSERT INTO Authors (twitterId, twitterUsername, twitterDisplayName)
                VALUES (?, ?, ?);`,
            author.twitterId,
            author.twitterUsername,
            author.twitterDisplayName,
        );
    } else if (guessType === types.EMAIL) {
        return db.run(
            `INSERT INTO Authors (emailAddress, emailName)
                VALUES (?, ?);`,
            author.emailAddress,
            author.emailName,
        );
    } else if (guessType === types.DISCORD) {
        return db.run(
            `INSERT INTO Authors (discordId, username, displayName)
                VALUES (?, ?, ?);`,
            author.discordId,
            author.username,
            author.displayName,
        );
    }
};

/*-------*\
  GUESSES
\*-------*/
const insertOrIgnoreGuessByType = (authorId, guess) => {
    if ([types.TWEET, types.TWITTER_DM].includes(guess.type)) {
        return db.run(
            `INSERT OR IGNORE INTO Guesses
                (authorId, type, text, tweetId)
            VALUES (?, ?, ?, ?);`,
            authorId,
            guess.type,
            guess.text,
            guess.tweetId,
        );
    } else if (guess.type === types.EMAIL) {
        return db.run(
            `INSERT OR IGNORE INTO Guesses
                (authorId, type, text)
            VALUES (?, ?, ?);`,
            authorId,
            guess.type,
            guess.text,
        );
    } else if (guess.type === types.DISCORD) {
        return db.run(
            `INSERT OR IGNORE INTO Guesses
                (authorId, type, text)
            VALUES (?, ?, ?);`,
            authorId,
            guess.type,
            guess.text,
            // guess.discordReplyId won't be set on guess creation
        );
    }
};

module.exports.getUnscoredGuesses = () =>
    db.all(
        `SELECT
            guessId, type, text, correct, bonusPoint,
            tweetId, discordReplyId,
            callsign, twitterDisplayName, displayName, emailName
        FROM Guesses
        LEFT JOIN Authors USING(authorId)
        WHERE episodeId IS NULL;`,
    );
module.exports.getCorrectGuesses = () =>
    db.all(
        `SELECT
            guessId, type, text, correct, bonusPoint,
            tweetId, discordReplyId,
            callsign, twitterDisplayName, displayName, emailName
        FROM Guesses
        LEFT JOIN Authors USING(authorId)
        WHERE correct
            AND episodeId = (
                SELECT episodeId FROM Episodes
                ORDER BY created_at DESC LIMIT 1
            );`,
    );
module.exports.addNewGuess = async ({guess, author}) => {
    // Inserts or updates Author, then inserts Guess and associates it to
    // Author. Returns 1 or 0, indicating whether the guess was a duplicate or
    // not.

    // SELECT existing (?) Author based on guess type
    let selectedAuthor = await getAuthorByGuessType(guess.type, author);

    // UPDATE or INSERT Author with incoming values. Ensure we have an authorId.
    if (selectedAuthor){
        author.authorId = selectedAuthor.authorId;
        await updateAuthorByGuessType(guess.type, author);
    }
    else {
        const authorInsert = await insertAuthorByGuessType(guess.type, author);
        selectedAuthor = {authorId: authorInsert.lastID};
    }

    // INSERT AND ASSOCIATE Guess
    const guessInsert = await insertOrIgnoreGuessByType(
        selectedAuthor.authorId,
        guess,
    );
    return guessInsert.changes;
};
module.exports.scoreGuess = async (guess) => {
    const currentEpisode = await db.get(
        'SELECT episodeId FROM Episodes ORDER BY created_at DESC LIMIT 1;',
    );
    return db.run(
        `UPDATE Guesses
            SET episodeId = COALESCE(episodeId, ?), correct = ?, bonusPoint = ?
            WHERE guessId = ?;`,
        currentEpisode.episodeId,
        guess.correct,
        guess.bonusPoint,
        guess.guessId,
    );
};

/*----------------*\
  SERVICE-SPECIFIC
\*----------------*/
module.exports.addEmailParseError = async (error) => {
    await db.run(
        `INSERT OR IGNORE INTO Authors (discordId, username) VALUES (0, 'error')`,
    );
    const errorAuthor = await db.get(
        `SELECT authorId FROM Authors WHERE discordId = 0 AND username = 'error';`,
    );
    db.run(
        `INSERT INTO Guesses (authorId, type, text) VALUES (?, ?);`,
        errorAuthor.authorId,
        types.EMAIL,
        error,
    );
};
module.exports.updateGuessDiscordReply = (guess) =>
    // Used by TWSF Discord integration. Guesses arriving in "hidden" slash
    // commands don't ever get a replyId. ReplyId points to the bot's response,
    // so we have to wait until after the initial submission.
    db.run(
        `UPDATE Guesses
            SET discordReplyId = ?
            WHERE guessId = ?;`,
        guess.discordReplyId,
        guess.guessId,
    );
