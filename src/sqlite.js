const dbFile = require('path').resolve("./.data/title-suggestions.db");
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
let db;


/*---------*\
  UTILITIES
\*---------*/
const printDbSummary = async ()=>{
    try {
        const selectTables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        const exists = selectTables.map(row=>row.name).join(", ");
        console.log(`Tables: ${exists}`)

        const suggestions = await db.all(
           `SELECT username, text
            FROM Suggestions
            LEFT JOIN Authors ON Authors.authorId = Suggestions.authorId
            ORDER BY suggestionId
            LIMIT 10`
        );
        if (suggestions.length) {
            console.log("Most recent suggestions:")
            console.table(suggestions)
        } else {
            console.log("No suggestions have been made yet.")
        }
    } catch (error) {
            console.error("There was an issue printing the db summary.")
            console.error(error)
    }
}


/*-------*\
  DB INIT
\*-------*/
const initDB = async ()=>{
    console.log("SQLite")
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database
    });
    console.log("Migrating...")
    await db.migrate()
    await printDbSummary()
}
initDB();

/*-------*\
  EPISODE
\*-------*/
const getCurrentEpisode = ()=>db.get("SELECT * FROM Episodes ORDER BY created_at DESC;");

module.exports.getCurrentEpNum = async()=>{
    const currentEp = await getCurrentEpisode();
    return currentEp.epNum;
}

module.exports.addNewEpisode = async(epNum)=>{
    await db.run("INSERT OR IGNORE INTO Episodes (epNum) VALUES (?);", epNum)
    const episode = await db.get(
        "SELECT * FROM Episodes WHERE epNum = ?;",
        epNum
    )
    return episode;
}

/*-----------*\
  SUGGESTIONS
\*-----------*/
module.exports.getSuggestion = (suggestion)=>{
    return db.get(
        "SELECT * FROM Suggestions WHERE suggestionId = ?",
        suggestion.suggestionId
    )
}

module.exports.getSuggestionsWithCountedVotes = async (episode={})=>{
    // default to current episode
    if (!episode.epNum) {
        episode = await getCurrentEpisode();
    }
    
    // SELECT votes count, Suggestion text and Author discordId for all votes on
    // Suggestions associated with epNum
    const countedSuggestions = await db.all(
       `SELECT
            COUNT(*) as voteCount,
            Suggestions.suggestionId,
            text,
            userName,
            displayname
        FROM Suggestion_Voters
            INNER JOIN Suggestions
                ON suggestions.SuggestionId = Suggestion_Voters.suggestionId
            INNER JOIN Authors
                ON Authors.authorId = Suggestions.authorId
        WHERE Suggestions.episodeId = (SELECT episodeId FROM Episodes WHERE epNum = ?)
        GROUP BY
            Suggestion_Voters.suggestionId;`,
        episode.epNum
    )
    const formattedCountedSuggestions = countedSuggestions.map(suggestion=>{
        // EXTRACT
        const {voteCount, suggestionId, text, username, displayName} = suggestion;
        // PACKAGE
        return {
            suggestion: {suggestionId, text},
            author: {username, displayName},
            voteCount
        };
    });
    return formattedCountedSuggestions;
}

module.exports.addNewSuggestion = async(author, suggestion)=>{
    // SELECT episode
    const episode = await getCurrentEpisode()

    // INSECT author
    await db.run(
        "INSERT OR IGNORE INTO Authors (discordId, username, displayName) VALUES (?, ?, ?);",
        author.discordId, author.username, author.displayName
    )
    const selectedAuthor = await db.get(
        "SELECT * FROM Authors WHERE discordId = ?;",
        author.discordId
    )
    
    // INSERT suggestion
    const suggestionsInsert = await db.run(
        "INSERT INTO Suggestions (episodeId, authorId, token, text) "+
        "VALUES (?, ?, ?, ?);",
        episode.episodeId, selectedAuthor.authorId,
        suggestion.token, suggestion.text
    );
    await db.run(
        "INSERT INTO Suggestion_Voters (suggestionId, authorId) VALUES (?, ?);",
        suggestionsInsert.lastID, selectedAuthor.authorId
    )
    
    // SELECT suggestion
    const newSuggestion = await db.get(
        "SELECT * FROM Suggestions WHERE suggestionId = ?;",
        suggestionsInsert.lastID
    )
    return newSuggestion;
}

/*------*\
  VOTING
\*------*/
module.exports.countVotesOnSuggestion = async (suggestion)=>{
    const voteCount = await db.get(
        "SELECT COUNT(*) FROM Suggestion_Voters WHERE suggestionId = ?;",
        suggestion.suggestionId
    );
    return voteCount["COUNT(*)"]
}

module.exports.hasVotedForSuggestion = (voter, suggestion)=>{
    return db.get(
        `SELECT authorId FROM Suggestion_Voters
         WHERE suggestionId = ?
             AND authorId = (SELECT authorId FROM Authors WHERE discordId = ?);`,
         suggestion.suggestionId, voter.discordId
     )
}

module.exports.addVoterToSuggestion = async (voter, suggestion)=>{
    await db.run(
        "INSERT OR IGNORE INTO Authors (discordId, username, displayName) VALUES (?, ?, ?);",
        voter.discordId, voter.username, voter.displayName
    )
    return db.run(
        `INSERT INTO Suggestion_Voters (suggestionId, authorId)
        VALUES (
            (?),
            (SELECT authorId FROM Authors WHERE discordId = ?)
        );`,
        suggestion.suggestionId, voter.discordId,
    );
}

module.exports.removeVoterFromSuggestion = (voter, suggestion)=>{
    return db.run(
       `DELETE FROM Suggestion_Voters
        WHERE suggestionId = (?)
        AND authorId = (SELECT authorId FROM Authors WHERE discordId = ?);`,
         suggestion.suggestionId, voter.discordId
    );
}
