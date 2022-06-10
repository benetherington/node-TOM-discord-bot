const logger = require('../logger');
let db;

/*---------*\
  UTILITIES
\*---------*/
const printDbSummary = async () => {
    try {
        const guesses = await db.all(
            `SELECT type, text
            FROM Guesses
            ORDER BY guessId DESC
            LIMIT 10`,
        );
        guesses.forEach((guess) => {
            guess.text = guess.text.slice(0, 40);
            Object.entries(types).forEach(([k, v]) => {
                if (v === guess.type) guess.type = k;
            });
        });
        if (guesses.length) {
            logger.info({msg: 'Most recent TWSF guesses:', guesses});
        } else {
            logger.info('No TWSF guesses have been made yet.');
        }
    } catch (error) {
        logger.error('There was an issue printing the TWSF db summary.', {
            error,
        });
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
const upsertAuthorByGuessType = (guessType, author) => {
    if (guessType == types.TWEET || guessType == types.TWITTER_DM) {
        return db.get(
            `INSERT INTO Authors
                (twitterId, twitterUsername, twitterDisplayName, callsign)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (twitterId)
                DO UPDATE SET
                    twitterDisplayName = excluded.twitterDisplayName,
                    callsign = excluded.callsign
            ON CONFLICT (twitterUsername)
                DO UPDATE SET
                    twitterDisplayName = excluded.twitterDisplayName,
                    callsign = excluded.callsign
            RETURNING authorId;`,
            author.twitterId,
            author.twitterUsername,
            author.twitterDisplayName,
            author.callsign,
        );
    } else if (guessType === types.EMAIL) {
        return db.get(
            `INSERT INTO Authors
                (emailAddress, emailName, callsign)
            VALUES (?, ?, ?)
            ON CONFLICT (emailAddress)
            DO UPDATE SET
                emailName = excluded.emailName,
                callsign = excluded.callsign
            RETURNING authorId;`,
            author.emailAddress,
            author.emailName,
            author.callsign,
        );
    } else if (guessType === types.DISCORD) {
        return db.get(
            `INSERT INTO Authors
                (discordId, username, displayName, callsign)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (discordId)
            DO UPDATE SET
                username = excluded.username,
                displayName = excluded.displayName,
                callsign = excluded.callsign
            RETURNING authorId;`,
            author.discordId,
            author.username,
            author.displayName,
            author.callsign,
        );
    }
};

module.exports.mergeAuthors = async (authorKeep, authorDelete) => {
    // Create a savepoint
    await db.run('SAVEPOINT merge_authors;');
    try {
        // Re-associate Guesses
        await db.run(
            `UPDATE Guesses
            SET authorId = ?
            WHERE authorId = ?;`,
            authorKeep.authorId,
            authorDelete.authorId,
        );
        // Re-associate Titles
        await db.run(
            `UPDATE Suggestions
            SET authorId = ?
            WHERE authorId = ?;`,
            authorKeep.authorId,
            authorDelete.authorId,
        );
        // Re-associate Votes
        await db.run(
            `UPDATE Suggestion_Voters
            SET voterId = ?
            WHERE voterId = ?;`,
            authorKeep.authorId,
            authorDelete.authorId,
        );

        // Merge authors
        const mergedAuthor = await db.get(
            `WITH
                author_keep AS (SELECT * FROM Authors WHERE authorId = ?),
                author_delete AS (SELECT * FROM Authors WHERE authorId = ?)
            SELECT
                COALESCE(author_keep.callsign, author_delete.callsign) AS callsign,
                COALESCE(author_keep.discordId, author_delete.discordId) AS discordId,
                COALESCE(author_keep.username, author_delete.username) AS username,
                COALESCE(author_keep.displayName, author_delete.displayName) AS displayName,
                COALESCE(author_keep.twitterId, author_delete.twitterId) AS twitterId,
                COALESCE(author_keep.twitterUsername, author_delete.twitterUsername) AS twitterUsername,
                COALESCE(author_keep.twitterDisplayName, author_delete.twitterDisplayName) AS twitterDisplayName,
                COALESCE(author_keep.emailAddress, author_delete.emailAddress) AS emailAddress,
                COALESCE(author_keep.emailName, author_delete.emailName) AS emailName,
                author_keep.notes || "<merged>" || author_delete.notes AS notes
            FROM author_keep, author_delete;`,
            authorKeep.authorId,
            authorDelete.authorId,
        );
        await db.run(
            `DELETE FROM Authors
            WHERE authorId = ?;`,
            authorDelete.authorId,
        );
        await db.run(
            `UPDATE Authors
            SET
                callsign = ?,
                discordId = ?,
                username = ?,
                displayName = ?,
                twitterId = ?,
                twitterUsername = ?,
                twitterDisplayName = ?,
                emailAddress = ?,
                emailName = ?,
                notes = ?
            WHERE authorId = ?`,
            mergedAuthor.callsign,
            mergedAuthor.discordId,
            mergedAuthor.username,
            mergedAuthor.displayName,
            mergedAuthor.twitterId,
            mergedAuthor.twitterUsername,
            mergedAuthor.twitterDisplayName,
            mergedAuthor.emailAddress,
            mergedAuthor.emailName,
            mergedAuthor.notes,
            authorKeep.authorId,
        );

        // If all that worked, we can release the savepoint.
        await db.run('RELEASE SAVEPOINT merge_authors;');
    } catch (error) {
        // Something went wrong, rollback to savepoint
        await db.run('ROLLBACK TO SAVEPOINT merge_authors;');
        logger.error({
            msg: 'Error while merging authors.',
            authorKeep,
            authorDelete,
            error,
        });
    }
};

// Stats
module.exports.getAuthorTwsfScore = (discordId) =>
    db.get(
        `SELECT
            SUM(correct) + SUM(bonusPoint) AS score,
            SUM(bonusPoint) AS bonusPoints
        FROM Guesses
        LEFT JOIN Authors USING(authorId)
        WHERE discordId = ?`,
        discordId,
    );
module.exports.getTwsfHighScores = () =>
    db.all(
        `SELECT
            SUM(correct) + SUM(bonusPoint) AS score,
            callsign,
            discordId
        FROM Guesses
        LEFT JOIN Authors USING(authorId)
        GROUP BY authorId
        ORDER BY score DESC
        LIMIT 5;`,
    );

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
            callsign
        FROM Guesses
        LEFT JOIN Authors USING(authorId)
        WHERE episodeId IS NULL;`,
    );
module.exports.getCorrectGuesses = () =>
    db.all(
        `SELECT
            guessId, type, text, correct, bonusPoint,
            tweetId, discordReplyId,
            callsign
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

    // UPSERT Author with incoming values.
    const {authorId} = await upsertAuthorByGuessType(guess.type, author);

    // INSERT AND ASSOCIATE Guess
    const {changes} = await insertOrIgnoreGuessByType(authorId, guess);
    return changes;
};
module.exports.scoreGuess = async (guess) => {
    const currentEpisode = await db.get(
        'SELECT episodeId FROM Episodes ORDER BY created_at DESC LIMIT 1;',
    );
    return db.run(
        `UPDATE Guesses
        SET
            /* Don't update episodeId if already set */
            episodeId = COALESCE(episodeId, ?),
            correct = ?,
            bonusPoint = ?
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
    // This is really bad, but shouldn't be invoked too often.
    // TODO: make this less really bad.

    // Create and fetch a placeholder Author for errors
    await db.run(
        `INSERT OR IGNORE INTO Authors (discordId, username) VALUES (0, 'error');`,
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
