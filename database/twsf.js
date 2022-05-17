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
            "SELECT name FROM sqlite_master WHERE type='table'",
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
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database,
    });
    console.log('Migrating Guesses...');
    await db.migrate({migrationsPath});
    await printDbSummary();
};
initDB();

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
    } else if (guess.type === types.EMAIL) {
        return db.get(
            'SELECT * FROM Authors WHERE emailAddress = ?;',
            author.emailAddress,
        );
    } else if (guess.type === types.DISCORD) {
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
const insertGuessByType = (authorId, guess) => {
    if (guess.type == types.TWEET || guess.type == types.TWITTER_DM) {
        return db.run(
            `INSERT INTO Guesses (authorId, type, text, tweetId)
                VALUES (?, ?, ?, ?);`,
            authorId,
            guess.type,
            guess.text,
            guess.tweetId,
        );
    } else if (guess.type === types.EMAIL) {
        return db.run(
            `INSERT INTO Guesses (authorId, type, text)
                VALUES (?, ?, ?);`,
            authorId,
            guess.type,
            guess.text,
        );
    } else if (guess.type === types.DISCORD) {
        return db.run(
            `INSERT INTO Guesses (authorId, type, text)
                VALUES (?, ?, ?, ?);`,
            authorId,
            guess.type,
            guess.text,
            // guess.discordReplyId won't be set on initial guess creation
        );
    }
};

/*-------*\
  EXPORTS
\*-------*/
module.exports.addNewTwsfGuess = async ({guess, author}) => {
    console.log('add new twsf guess');
    console.table({author, guess});

    // FIND Author based on guess type
    const selectedAuthor = await getAuthorByGuessType(guess.type, author);

    // UPSERT Author with incoming values
    if (selectedAuthor) await updateAuthorByGuessType(guess.type, author);
    else selectedAuthor = await insertAuthorByGuessType(guess.type, author);

    // INSERT AND ASSOCIATE Guess
    const guessInsert = await insertGuessByType(selectedAuthor.authorId, guess);
    return guessInsert;
};
module.exports.updateTwsfGuess = (guess, messageId) => {
    console.log('update twsf guess');
    console.table({guess, messageId});

    return db.run(
        `UPDATE Guesses
            SET discordReplyId = ?
            WHERE guessId = ?;`,
        messageId,
        guess.guessId,
    );
};
