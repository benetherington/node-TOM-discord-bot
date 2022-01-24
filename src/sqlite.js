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
  let selectTables = await db.all("SELECT name FROM sqlite_schema WHERE type='table'");
  let exists = selectTables.map(row=>row.name);
  console.log(`Waking up SQLite. Tables: ${exists}`)

  let firstSuggestions = await db.all("SELECT suggestion from Suggestions ORDER BY suggestion_id LIMIT 10");
  firstSuggestions = firstSuggestions.map(r=>r.suggestion).join(", ");
  console.log(`Most recent suggestions: ${firstSuggestions}`)
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



/*---------------*\
  UTILITIES, MORE
\*---------------*/
class PermittedAuthor extends Object {
  constructor(options={}) {
    let author = super();
    author.permit(options)
  }
  permit(options) {
    if (options.discordId) {this.discordId = options.discordId;}
    if (options.name)      {this.name      = options.name;}
    if (options.nick)      {this.nick      = options.nick;}
  }
  fetch() {
    try {
      // build a query to find this object in the db, using the highest certainty column
      let query = [`SELECT * FROM Authors WHERE`];
      if (this.recordId) {
        query.push(`author_id = ${this.recordId},`)
      } else if (this.discordId) {
        query.push(`discord_id = ${this.discordId}`)
      } else {
        throw new Error("PermittedAuthor.fetch needs a record ID or a discord ID!")
      }
      return db.get(query.join(" "))
    } catch (DatabaseError) {console.error(DatabaseError)}
  }
  async pull() {
    try {
      // find the current data record, returning null if not found
      let data = await this.fetch();
      if (!data) {return null;}

      // check for differences between this and the database record
      let changed = new Object();
      if (this.discordId !== data.discordId) {changed.discordId = data.discordId}
      if (this.name      !== data.name)      {changed.name      = data.name}
      if (this.nick      !== data.nick)      {changed.nick      = data.nick}

      // update this, return any changes
      Object.assign(this, data)
      return changed;
    } catch (DatabaseError) {
      console.error(DatabaseError)
    }
  }
  async push() {
    try {
      // Make sure there's a record to update, and that we know which one it is
      let fetchData = await this.fetch();
      if (fetchData) {
        // grab recordId just in case
        this.recordId = fetchData.author_id;
      } else {
        // there's no record
        if (!this.discordId) {throw new Error("PermittedAuthor.push requires a discordId!")}
        await db.run(`INSERT INTO Authors (discord_id) VALUES (${this.discordId})`);
        fetchData = await this.fetch();
        this.recordId = fetchData.author_id;
      }
      
      // Build UPDATE query
      let query = ["UPDATE Authors SET"]
      let toUpdate = [];
      if (this.discordId) {
        toUpdate.push(`discord_id = ${this.discordId}`)
      } else if (this.name) {
        toUpdate.push(`name = ${this.discordId}`)
      } else if (this.nick) {
        toUpdate.push(`nick = ${this.nick}`)
      } else {
        throw new Error("push called on empty PermittedAuthor!")
      }
      query.push(toUpdate.join(", "))
      query.push(`WHERE author_id = ${this.recordId};`)
      
      // Run query
      await db.run(query.join(" "))
    } catch (DatabaseError) {
      console.error(DatabaseError)
    }
  }
}

class PermittedEpisode extends Object {
  constructor(options={}) {
    let episode = super();
    episode.permit(options)
  }
  permit(options) {
    if (options.epNum) {this.epNum = options.epNum;}
  }
  fetch() {
    try {
      // build a query to find this object in the db, using the highest certainty column
      let query = [`SELECT * FROM Episodes WHERE`];
      if (this.recordId) {
        query.push(`episode_id = ${this.recordId},`)
      } else if (this.discordId) {
        query.push(`ep_num = ${this.epNum}`)
      } else {
        throw new Error("PermittedEpisode.fetch needs a record ID or an episode number!")
      }
      return db.get(query.join(" "))
    } catch (DatabaseError) {
      console.error(DatabaseError)
    }
  }
  async pull() {
    try {
      // find the current data record, returning null if not found
      let data = await this.fetch();
      if (!data) {return null;}

      // check for differences between this and the database record
      let changed = new Object();
      if (this.epNum !== data.epNum) {changed.epNum = data.epNum}

      // update this, return any changes
      Object.assign(this, data)
      return changed;
    } catch (DatabaseError) {
      console.error(DatabaseError)
    }
  }
  async push() {
    try {
      // Make sure there's a record to update, and that we know which one it is
      let fetchData = await this.fetch();
      if (fetchData) {
        // grab recordId just in case
        this.recordId = fetchData.episode_id;
      } else {
        // there's no record
        if (!this.discordId) {throw new Error("PermittedEpisode.push requires an epNum!")}
        await db.run(`INSERT INTO Episodes (ep_num) VALUES (${this.epNum})`);
        fetchData = await this.fetch();
        this.recordId = fetchData.episode_id;
      }

      // Build UPDATE query
      let query = `UPDATE Episodes SET ep_num = ${this.epNum} WHERE episode_id = ${this.recordId};`

      // Run query
      await db.run(query)
    } catch (DatabaseError) {
      console.error(DatabaseError)
    }
  }
}

class PermittedSuggestion extends Object {
  constructor(options={}) {
    let suggestion = super();
    suggestion.permit(options);
  }
  permit(options) {
    if (options.recordId)   {this.recordId   = options.recordId;}
    if (options.suggestion) {this.suggestion = options.suggestion;}
    if (options.messageId)  {this.messageId  = options.messageId;}
    if (options.jumpUrl)    {this.jumpUrl    = options.jumpUrl;}
  }
  fetch() {
    try {
      // build a query to find this object in the db, using the highest certainty column
      let query = [`SELECT * FROM Suggestions WHERE`];
      if (this.recordId) {
        query.push(`suggestion_id = ${this.recordId},`)
      } else if (this.discordId) {
        query.push(`message_id = ${this.message_id}`)
      } else if (this.discordId) {
        query.push(`url = ${this.jumpUrl}`)
      } else {
        throw new Error("PermittedEpisode.fetch needs a recordId or a messageId!")
      }
      return db.get(query.join(" "))
    } catch (DatabaseError) {console.error(DatabaseError)}
  }
  
}

// build statments from permitted parameter objects
let wherever = (permitted)=>{
  let equalities = Object.keys(permitted)
                   .map(key=>`${key.slice(1)} = ${key}`);
  return " WHERE " + equalities.join(" AND ");
}
let valueable = (permitted)=>{
  let params = Object.keys(permitted);
  let columns = params.map(k=>k.slice(1));
  return ` (${columns.join(", ")}) VALUES (${params.join(", ")}) `
}


/*-------*\
  EXPORTS
\*-------*/
module.exports = {
  PermittedAuthor: PermittedAuthor,
  getCurrentEpNum: async() => { await assureLoaded();
    console.log("getCurrentEpNum")
    try {
      console.log("try")
      let result = await db.get("SELECT ep_num FROM Episodes ORDER BY ep_num DESC");
      return result.ep_num || null;
    } catch (Error) {
      console.log("caught")
      console.error(Error)
    }
  },
  addNewSuggestion: async({author, episode, suggestion})=>{ await assureLoaded();
    // let permittedEpisode = permitEpisode(episode);
    // let permittedSuggestion = permitSuggestion(suggestion);
    // console.log(`New suggestion: ${permittedSuggestion}`)
    // let episodeId = await db.get(
    //   `SELECT episode_id FROM Episodes ${wherever(permittedEpisode)}`,
    //   permittedEpisode
    // )
    // permittedSuggestion.$episode_id = episodeId;
    // await db.run("INSERT INTO Suggestions" + valueable(permittedSuggestion))
  }
};
