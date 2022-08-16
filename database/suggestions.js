const logger = require('../logger');

let db;

/*---------*\
  UTILITIES
\*---------*/
const printSuggestionsSummary = async () => {
    try {
        const suggestions = await db.all(
            `SELECT username, text
            FROM Suggestions
            LEFT JOIN Authors ON Authors.authorId = Suggestions.authorId
            ORDER BY suggestionId
            LIMIT 10`,
        );
        if (suggestions.length) {
            logger.info({msg: 'Most recent suggestions:', suggestions});
        } else {
            logger.info('No suggestions have been made yet.');
        }
    } catch (error) {
        logger.error({
            msg: 'There was an issue printing the suggestions db summary.',
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
initDB();

/*-------*\
  EPISODE
\*-------*/
const getCurrentEpisode = () =>
    db.get('SELECT * FROM Episodes ORDER BY created_at DESC LIMIT 1;');
module.exports.getCurrentEpNum = async () => {
    const currentEp = await getCurrentEpisode();
    return currentEp.epNum;
};
module.exports.addNewEpisode = (epNum) =>
    db.run('INSERT OR IGNORE INTO Episodes (epNum) VALUES (?);', epNum);

/*-----------*\
  SUGGESTIONS
\*-----------*/
module.exports.getSuggestion = (suggestion) => {
    return db.get(
        'SELECT * FROM Suggestions WHERE suggestionId = ?',
        suggestion.suggestionId,
    );
};
module.exports.getSuggestionsWithCountedVotes = async (
    episode = {},
    getEpNum,
) => {
    // TODO: simplify this per comment on #48
    // default to current episode
    if (!episode.epNum) {
        episode = await getCurrentEpisode();
    }

    // SELECT votes count, Suggestion text and Author discordId for all votes on
    // Suggestions associated with epNum
    const countedSuggestions = await db.all(
        `SELECT
            COUNT(*) AS voteCount,
            Suggestion_voters.suggestionId,
            text,
            username,
            displayName,
            epNum
        FROM
            Suggestion_Voters
                INNER JOIN Suggestions USING(suggestionId)
                INNER JOIN Authors USING(authorId)
                INNER JOIN Episodes USING(episodeId)
        WHERE epNum = ?
        GROUP BY
            Suggestion_Voters.suggestionId;`,
        episode.epNum,
    );
    const formattedCountedSuggestions = countedSuggestions.map((suggestion) => {
        // EXTRACT
        const {voteCount, suggestionId, text, username, displayName} =
            suggestion;
        // PACKAGE
        return {
            suggestion: {suggestionId, text},
            author: {username, displayName},
            voteCount,
        };
    });
    if (getEpNum) return [episode.epNum, formattedCountedSuggestions];
    else return formattedCountedSuggestions;
};
module.exports.addNewSuggestion = async (author, suggestion) => {
    // SELECT Episode
    const episode = await getCurrentEpisode();

    // UPSERT Author
    const {authorId} = await db.get(
        `INSERT INTO Authors (
            discordId,
            username,
            displayName,
            callsign
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT (discordId)
        DO UPDATE SET
            username = excluded.username,
            displayName = excluded.displayName,
            callsign = COALESCE(callsign, excluded.callsign)
        RETURNING authorId;`,
        author.discordId,
        author.username,
        author.displayName,
        author.callsign,
    );

    // INSERT Suggestion
    const {lastID: suggestionId} = await db.run(
        `INSERT INTO Suggestions
            (episodeId, authorId, text)
        VALUES (?, ?, ?);`,
        episode.episodeId,
        authorId,
        suggestion.text,
    );

    // INSERT default self-vote
    await db.run(
        `INSERT INTO Suggestion_Voters (suggestionId, voterId)
        VALUES (?, ?);`,
        suggestionId,
        authorId,
    );

    return suggestionId;
};
module.exports.deleteSuggestion = (suggestion) => {
    return db.run(
        `DELETE FROM Suggestions WHERE suggestionId = ?;`,
        suggestion.suggestionId,
    );
};
module.exports.getAuthorSubmissionCount = (discordId) =>
    db.get(
        `SELECT
            COUNT(*) as submissions
        FROM Suggestions
        LEFT JOIN Authors USING(authorId)
        WHERE discordId = ?;`,
        discordId,
    );
module.exports.getSubmissionHighScores = () =>
    db.all(
        `SELECT
            COUNT(*) AS submissions,
            discordId
        FROM Suggestions
        LEFT JOIN Authors USING(authorId)
        GROUP BY authorId
        ORDER BY submissions DESC
        LIMIT 5;`,
    );

/*------*\
  VOTING
\*------*/
module.exports.countVotesOnSuggestion = async (suggestion) => {
    const voteCount = await db.get(
        'SELECT COUNT(*) FROM Suggestion_Voters WHERE suggestionId = ?;',
        suggestion.suggestionId,
    );
    return voteCount['COUNT(*)'];
};
module.exports.toggleVoter = async (voter, suggestion) => {
    // UPSERT voter
    const {voterId} = await db.get(
        `INSERT INTO Authors (
            discordId,
            username,
            displayName,
            callsign
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT (discordId)
        DO UPDATE SET
            username = excluded.username,
            displayName = excluded.displayName,
            callsign = COALESCE(callsign, excluded.callsign)
        RETURNING authorId AS voterId;`,
        voter.discordId,
        voter.username,
        voter.displayName,
        voter.callsign,
    );

    // Attempt to INSERT vote
    const {changes} = await db.run(
        `INSERT OR IGNORE INTO Suggestion_Voters
            (voterId, suggestionId)
        VALUES (?, ?);`,
        voterId,
        suggestion.suggestionId,
    );

    // DELETE vote if insert ignored
    if (!changes)
        await db.run(
            `DELETE FROM Suggestion_Voters
            WHERE voterId = ? AND suggestionId = ?;`,
            voterId,
            suggestion.suggestionId,
        );

    // Return 1 if added, 0 if deleted
    return changes;
};
module.exports.getAuthorVotesCast = (discordId) =>
    db.get(
        `SELECT
            COUNT(*) AS votesCast
        FROM Suggestion_Voters
        LEFT JOIN Authors ON authorId = voterId
        WHERE discordId = ?;`,
        discordId,
    );
module.exports.getVotesCastHighScores = () =>
    db.all(
        `SELECT
            COUNT(*) AS votesCast,
            discordId
        FROM Suggestion_Voters
        LEFT JOIN Authors ON (authorId = voterId)
        GROUP BY voterId
        ORDER BY votesCast DESC
        LIMIT 5;`,
    );
module.exports.getAuthorVotesEarned = (discordId) =>
    db.get(
        `SELECT
            COUNT(*) AS votesEarned
        FROM Suggestion_Voters
        LEFT JOIN Suggestions USING(suggestionId)
        LEFT JOIN Authors USING(authorId)
        WHERE
            discordId = ?
            AND voterId != authorId;`,
        discordId,
    );
module.exports.getVotesEarnedHighScores = () =>
    db.all(
        `SELECT
            COUNT(*) AS votesEarned,
            discordId
        FROM Suggestion_voters
        LEFT JOIN Suggestions USING(suggestionId)
        LEFT JOIN Authors USING(authorId)
        WHERE voterId != authorId
        GROUP BY authorId
        ORDER BY votesEarned DESC
        LIMIT 5;`,
    );
