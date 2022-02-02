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
                let exists = selectTables.map(row=>row.name);
                console.log(`Waking up SQLite. Tables: ${exists}`)

                let firstSuggestions = await db.all("SELECT suggestion from Suggestions ORDER BY suggestion_id LIMIT 10");
                firstSuggestions = firstSuggestions.map(r=>r.suggestion).join(", ");
                console.log(`Most recent suggestions: ${firstSuggestions}`)
        } catch {
                console.error("There was an issue printing the db summary.")
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
const getCurrentEpNum = async() => {
    await assureLoaded();

    try {
        let result = await db.get("SELECT ep_num FROM Episodes ORDER BY ep_num DESC");
        return result.ep_num || null;
    } catch (Error) {
        console.error(Error)
    }
}

const addNewEpisode = async(epNum)=>{
    const existingRecord = await db.get(
        "SELECT episode_id FROM Episodes WHERE epNum = ?",
        epNum
    )
    if (existingRecord) return existingRecord.episode_id;
    const newRecord = await db.run(
        "INSERT INTO Episodes (epNum) VALUES (?)",
        epNum
    )
    return newRecord.lastID;
}

const addNewSuggestion = async(episode, author, suggestion)=>{
    await assureLoaded();
    
    const episode = await db.run(
        "SELECT episode_id FROM Episodes WHERE epNum = ?",
        await getCurrentEpNum()
    )

    let permittedAuthor = new PermittedAuthor(author);
    const author = await db.run(
        "SELECT author_id FROM Authors WHERE id = ?",
        permittedAuthor.id
    )

    let permittedSuggestion = new PermittedSuggestion(suggestion);
    permittedSuggestion.permit({
        episodeId: permittedEpisode.recordId,
        authorId: permittedAuthor.recordId
    })
    await permittedSuggestion.push();
}

module.exports = {getCurrentEpNum, addNewEpisode, addNewSuggestion};

/*
basic functionality test:

node> let pa, pe, ps, db;
node> db = require("./src/sqlite.js");
node> pa = new db.PermittedAuthor(db.mock.author); pa.push();
node> pe = ...; pe.push();
node> ps = ...;
node> ps.associateAuthor(pa);
node> ps.associateEpisode(pe);
node> ps.push();
*/

