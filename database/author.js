const logger = require('../logger');
let db;

/*-------*\
  DB INIT
\*-------*/
const initDB = async () => {
    db = await require('./public');
};
initDB();

module.exports.getAuthors = (limit=40, offset=0)=>
    db.all(
        `SELECT
            authorId,
            callsign,
            username,
            displayName,
            twitterUsername,
            twitterDisplayName,
            emailAddress,
            emailName,
            notes
        FROM Authors
        LIMIT ?
        OFFSET ?;`,
        limit,
        offset
    )
module.exports.updateAuthorNotes = (author) =>
    db.run(
        `UPDATE Authors
        SET notes = ?
        WHERE authorId = ?;`,
        author.notes,
        author.authorId
    )
module.exports.updateAuthorCallsign = (author) =>
    db.run(
        `UPDATE Authors
        SET callsign = ?
        WHERE authorId = ?;`,
        author.callsign,
        author.authorId
    )
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
