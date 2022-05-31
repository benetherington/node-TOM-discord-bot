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

        const suggestions = await db.all(
            `SELECT username, text
            FROM Suggestions
            LEFT JOIN Authors ON Authors.authorId = Suggestions.authorId
            ORDER BY suggestionId
            LIMIT 10`,
        );
        if (suggestions.length) {
            console.log('Most recent suggestions:');
            console.table(suggestions);
        } else {
            console.log('No suggestions have been made yet.');
        }
    } catch (error) {
        console.error('There was an issue printing the db summary.');
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
    const {lastID: authorId} = await db.run(
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
            callsign = excluded.callsign;`,
        author.discordId,
        author.username,
        author.displayName,
        author.callsign
    );

    // INSERT Suggestion
    const {lastID: suggestionId} = await db.run(
        `INSERT INTO Suggestions
            (episodeId, authorId, text)
        VALUES (?, ?, ?, ?);`,
        episode.episodeId,
        authorId,
        suggestion.text,
    );
    
    // INSERT vote
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
    const {lastID: voterId} = await db.run(
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
            callsign = excluded.callsign;`,
        voter.discordId,
        voter.username,
        voter.displayName,
        voter.callsign,
    );
    
    // Attempt to INSERT vote
    const {changes} = await db.run(
        `INSERT OR IGNORE INTO Suggestion_Voters
            (suggestionId, voterId)
        VALUES (?, ?);`,
        voterId,
        suggestion.suggestionId,
    )
    
    // DELETE vote if insert ignored
    if (!changes) db.run(
        `DELETE FROM Suggestion_Voters
        WHERE suggestionId = ? AND voterId = ?;`
    )
    
    // Return 1 if added, 0 if deleted
    return changes;
}

hasVotedForSuggestion = (voter, suggestion) => {
    return db.get(
        `SELECT voterId FROM Suggestion_Voters
        INNER JOIN Authors ON authorId = voterId
        WHERE suggestionId = ? AND discordId = ?;`,
        suggestion.suggestionId,
        voter.discordId,
    );
};

addVoterToSuggestion = async (voter, suggestion) => {
    await db.run(
        'INSERT OR IGNORE INTO Authors (discordId, username, displayName) VALUES (?, ?, ?);',
        voter.discordId,
        voter.username,
        voter.displayName,
    );
    return db.run(
        `INSERT INTO Suggestion_Voters (suggestionId, voterId)
        VALUES (
            (?),
            (SELECT authorId FROM Authors WHERE discordId = ?)
        );`,
        suggestion.suggestionId,
        voter.discordId,
    );
};

removeVoterFromSuggestion = (voter, suggestion) => {
    return db.run(
        `DELETE FROM Suggestion_Voters
        WHERE suggestionId = (?)
        AND voterId = (SELECT authorId FROM Authors WHERE discordId = ?);`,
        suggestion.suggestionId,
        voter.discordId,
    );
};
