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
        console.log(`Waking up SQLite. Tables: ${exists}`)

        const suggestions = await db.all("SELECT text from Suggestions ORDER BY suggestionId LIMIT 10");
        if (suggestions.length) {
            const suggestionsString = suggestions.map(r=>r.suggestion).join(", ");
            console.log(`Most recent suggestions: ${suggestionsString}`)
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
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database
    });
    await db.migrate()
    printDbSummary()
}
initDB();

/*-------*\
  EPISODE
\*-------*/
const getCurrentEpisode = ()=>db.get("SELECT * FROM Episodes ORDER BY created_at DESC;");

const getCurrentEpNum = async()=>{
    const currentEp = await getCurrentEpisode();
    return currentEp.epNum;
}

const addNewEpisode = async(epNum)=>{
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
const getSuggestion = (suggestion)=>{
    return db.get(
        "SELECT * FROM Suggestions WHERE suggestionId = ?",
        suggestion.suggestionId
    )
}

const getSuggestions = async (episode={})=>{
    // default to current episode
    if (!episode.epNum) {
        episode = await getCurrentEpisode();
    }
    
    // SELECT Suggestions that match SELECTed Episode
    return await db.all(
       `SELECT * FROM Suggestions WHERE episodeId = (
            SELECT episodeId FROM Episodes WHERE epNum = ?
        );`,
        episode.epNum
    )
}

const addNewSuggestion = async(author, suggestion)=>{
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
const countVotesOnSuggestion = async (suggestion)=>{
    const voteCount = await db.get(
        "SELECT COUNT(*) FROM Suggestion_Voters WHERE suggestionId = ?;",
        suggestion.suggestionId
    );
    return voteCount["COUNT(*)"]
}

const addVoterToSuggestion = (voter, suggestion)=>{
    db.run(
       `INSERT INTO Suggestion_Voters (suggestionId, authorId)
        VALUES (
            (?),
            (SELECT authorId FROM Authors WHERE discordId = ?)
        );`,
        suggestion.suggestionId, voter.discordId
    );
}

module.exports = {
    // Episodes
    getCurrentEpNum, addNewEpisode,

    // Suggestions
    getSuggestion, getSuggestions, addNewSuggestion,

    // Voting
    countVotesOnSuggestion, addVoterToSuggestion
};
