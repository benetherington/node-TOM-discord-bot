const dbFile = require('path').resolve("./.data/title-suggestions.db");
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
let db;


/*---------*\
  UTILITIES
\*---------*/
// await assureLoaded before interacting with the database
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
  EXPORTS
\*-------*/
const getCurrentEpisode = ()=>db.get("SELECT * FROM Episodes ORDER BY updated_at DESC;");

const getCurrentEpNum = async()=>{
    const episode = await getCurrentEpisode();
    return episode.epNum;
}

const addNewEpisode = async(epNum)=>{
    const inserted = await db.run("INSERT OR IGNORE INTO Episodes (epNum) VALUES (?);", epNum)
    return inserted.lastID;
}

const addNewSuggestion = async(author, suggestion)=>{
    // SELECT Episode
    const episode = await getCurrentEpisode()

    // INSECT Author
    await db.run(
        "INSERT OR IGNORE INTO Authors (discordId, username, displayName) VALUES (?, ?, ?);",
        author.discordId, author.username, author.displayName
    )
    const selectedAuthor = await db.get(
        "SELECT * FROM Authors WHERE discordId = ?;",
        author.discordId
    )
    
    // INSERT Suggestion, associate with Author
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
    
    // SELECT Suggestion
    const newSuggestion = await db.get(
        "SELECT * FROM Suggestions WHERE suggestionId = ?;",
        suggestionsInsert.lastID
    )
    return newSuggestion;
}

module.exports = {getCurrentEpNum, addNewEpisode, addNewSuggestion};
