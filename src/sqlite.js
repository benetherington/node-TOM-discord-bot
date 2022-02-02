/**
 * Module handles database management
 *
 * Server API calls the methods in here to query and update the SQLite database
 */


/*--------*\
  DB SETUP
\*--------*/
const dbFile = require('path').resolve("./.data/title-suggestions.db");
const sqlite3 = require("sqlite3").verbose();
// We're using the sqlite wrapper so that we can make async / await connections
// - https://www.npmjs.com/package/sqlite
const dbWrapper = require("sqlite");
let db;


/*---------*\
  UTILITIES
\*---------*/
// await assureLoaded before interacting with the database
let assureLoaded = async()=>{await wrapperPromise;}
let printDbSummary = async ()=>{
        try {
                // TODO: running this SELECT query works from the command line tool, but
                // generates a "no table" error inside node.
                let selectTables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
                let exists = selectTables.map(row=>row.name).join(", ");
                console.log(`Waking up SQLite. Tables: ${exists}`)

                let selectSuggestions = await db.all("SELECT text from Suggestions ORDER BY suggestionId LIMIT 10");
                if (selectSuggestions.length) {
                    firstSuggestions = selectSuggestions.map(r=>r.suggestion).join(", ");
                    console.log(`Most recent suggestions: ${firstSuggestions}`)
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
let wrapperPromise = dbWrapper
    .open({
        filename: dbFile,
        driver: sqlite3.cached.Database
    })
    .then(async dBase => {
        db = dBase;
        try {
            await db.migrate() // defaults to no force, table migrations, path ./migrations
            await printDbSummary()
        } catch (dbError) {
            console.error(dbError);
        }
    })
    .catch(e=>console.error(e))



/*------------------*\
  DB REPRESENTATIONS
\*-----------------*/
// class Permittable extends Object {
//     constructor() {
//         const permittable = super();
//         Object.defineProperties(permittable, {
//             recordId: {enumerable: true}
//         })
//     }
    
//     /*
//     Property input and output
//     */
//     permit(options) {
//         const propertyNames = Object.getOwnPropertyNames(this);
//         for (const propertyName of propertyNames) {
//             if (options[propertyName]) {
//                 this[propertyName] = options[propertyName];
//             }
//         }
//     }
//     simplify() {
//         return new Object.fromEntries(Object.entries(this))
//     }
// }


// class PermittedAuthor extends Permittable {
//     constructor(options={}) {
//         let author = super();
//         Object.defineProperties(author, {
//             id: {enumerable: true},
//             username: {enumerable: true},
//             displayName: {enumerable: true},
//         })
//         author.permit(options)
//     }
// }

// class PermittedSuggestion extends Permittable {
//     constructor(options={}) {
//         let suggestion = super();
//         Object.defineProperties(suggestion, {
//             authorId: {enumerable:true},
//             episodeId: {enumerable:true},
//             token: {enumerable: true},
//             text: {enumerable:true},
//             voters: {enumerable: true}
//         })
//         suggestion.permit(options);
//     }
// }


/*-------*\
  EXPORTS
\*-------*/
const getCurrentEpisode = ()=>db.get("SELECT * FROM Episodes ORDER BY epNum DESC;");

const getCurrentEpNum = async()=>{
    await assureLoaded();
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

const addNewSuggestion = async(author, suggestion)=>{
    await assureLoaded();
    
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

module.exports = {getCurrentEpNum, addNewEpisode, addNewSuggestion};
