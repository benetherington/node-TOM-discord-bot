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
class PermittedAuthor extends Object {
  constructor(options={}) {
    let author = super();
    author.permit(options)
  }
  
  /* AUTHOR
  Safely pass in new properties.
  */
  permit(options) {
    if (options.discordId) {this.discordId = options.discordId;}
    if (options.name)      {this.name      = options.name;}
    if (options.nick)      {this.nick      = options.nick;}
  }
  
  /* AUTHOR
  Safely fetch data associated with this object.
  */
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
  
  /* AUTHOR
  Update this object from the database. Requires a record to exist.
  Slently fails if one doesn't. Returns changed attributes if one does.
  */
  async pull() {
    try {
      // find the current data record, returning null if not found
      let data = await this.fetch();
      if (!data) {return {success: false};}

      // check for differences between this and the database record
      let changed = {success: true};
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
  
  /* AUTHOR
  Update the database from this object. Creates a new record if need be.
  Throws an error if there's not enough data to create or find a record.
  */
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
      query.push(` WHERE author_id = ${this.recordId};`)
      
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
  
  /* EPISODE
  Safely pass in new properties.
  */
  permit(options) {
    if (options.epNum) {this.epNum = options.epNum;}
  }
  
  /* EPISODE
  Safely fetch data associated with this object.
  */
  fetch() {
    try {
      // build a query to find this object in the db, using the highest certainty column
      let query = [`SELECT * FROM Episodes WHERE`];
      if (this.recordId) {
        query.push(`episode_id = ${this.recordId},`)
      } else if (this.epNum) {
        query.push(`ep_num = ${this.epNum}`)
      } else {
        throw new Error("PermittedEpisode.fetch needs a record ID or an episode number!")
      }
      return db.get(query.join(" "))
    } catch (DatabaseError) {
      console.error(DatabaseError)
    }
  }
  
  /* EPISODE
  Update this object from the database. Requires a record to exist.
  Slently fails if one doesn't. Returns changed attributes if one does.
  */
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
  
  /* EPISODE
  Update the database from this object. Creates a new record if need be.
  Throws an error if there's not enough data to create or find a record.
  */
  async push() {
    try {
      // Make sure there's a record to update, and that we know which one it is
      let fetchData = await this.fetch();
      if (fetchData) {
        // grab recordId just in case
        this.recordId = fetchData.episode_id;
      } else {
        // there's no record
        if (!this.epNum) {throw new Error("PermittedEpisode.push requires an epNum!")}
        await db.run(`INSERT INTO Episodes (ep_num) VALUES (${this.epNum})`);
        fetchData = await this.fetch();
        this.recordId = fetchData.episode_id;
      }

      // Build UPDATE query
      let query = `UPDATE Episodes SET ep_num = ${this.epNum} WHERE episode_id = ${this.recordId};`

      // Run query
      await db.run(query)
      return true
    } catch (DatabaseError) {
      console.error(DatabaseError)
      return false
    }
  }
}






class PermittedSuggestion extends Object {
  constructor(options={}) {
    let suggestion = super();
    suggestion.permit(options);
  }
  
  /* SUGGESTION
  Safely pass in new properties.
  */
  permit(options) {
    if (options.recordId)   {this.recordId   = options.recordId;}
    if (options.authorId)   {this.authorId   = options.authorId;}
    if (options.episodeId)  {this.episodeId  = options.episodeId;}
    if (options.messageId)  {this.messageId  = options.messageId;}
    if (options.suggestion) {this.suggestion = options.suggestion;}
    if (options.jumpUrl)    {this.jumpUrl    = options.jumpUrl;}
  }
  
  /* SUGGESTION
  Safely add episodeId and authorId.
  */
  associateEpisode(episode) {
    if (!episode instanceof PermittedEpisode) {throw new Error("associate episode got unpermitted")}
    this.episodeId = episode.recordId;
  }
  associateAuthor(author) {
    if (!author instanceof PermittedAuthor) {throw new Error("associate author got unpermitted")}
    this.authorId = author.recordId;
  }
  
  /* SUGGESTION
  Safely fetch data associated with this object.
  */
  fetch() {
    try {
      // build a query to find this object in the db, using the highest certainty column
      let query = [`SELECT * FROM Suggestions WHERE`];
      if (this.recordId) {
        query.push(`suggestion_id = ${this.recordId},`)
      } else if (this.messageId) {
        query.push(`message_id = ${this.messageId}`)
      } else {
        throw new Error("PermittedEpisode.fetch needs a recordId or a messageId!")
      }
      return db.get(query.join(" "))
    } catch (DatabaseError) {
      console.error(DatabaseError)
    }
  }
  
  /* SUGGESTION
  Update this object from the database. Requires a record to exist.
  Slently fails if one doesn't. Returns changed attributes if one does.
  */
  async pull() {
    try {
      // find the current data record, returning null if not found
      let data = await this.fetch();
      if (!data) {return null;}

      // check for differences between this and the database record
      let changed = new Object();
      ["recordId","suggestion","messageId","jumpUrl"].forEach(prop=>{
        if (this[prop] !== data[prop]) {changed[prop] = data[prop]}
      })

      // update this, return any changes
      Object.assign(this, data)
      return changed;
    } catch (DatabaseError) {
      console.error(DatabaseError)
    }
  }
  
  /* SUGGESTION
  Update the database from this object. Creates a new record if need be.
  Throws an error if there's not enough data to create or find a record.
  */
  async push() {
    try {
      // Make sure there's a record to update, and that we know which one it is
      let fetchData = await this.fetch();
      if (fetchData) {
        // grab recordId just in case
        this.recordId = fetchData.suggestion_id;
      } else {
        // there's no record
        // TODO: we're running an INSERT then an UPDATE. Should we instead just do one or the other?
        // TODO: this is complicated by whether values should be required in the DB or not.
        if (!this.messageId) {throw new Error("PermittedSuggestion.push requires a messageId!")}
        let insertStatement = await db.run(
          `INSERT INTO Suggestions (message_id, episode_id, author_id) VALUES (?,?,?)`,
          [this.messageId, this.episodeId, this.authorId]
        ).then(statement=>statement);
        this.recordId = insertStatement.lastID;
      }
      
      // Build UPDATE query
      let query = ["UPDATE Suggestions SET"]
      let toUpdate = [];
      let params = [];
      if (this.suggestion) {
        toUpdate.push("suggestion = ?")
        params.push(this.suggestion)
      } else if (this.messageId) {
        toUpdate.push("message_id = ?")
        params.push(this.messageId)
      } else if (this.authorId) {
        toUpdate.push("author_id = ?")
        params.push(this.authorId)
      } else if (this.jumpUrl) {
        toUpdate.push("jump_url = ?")
        params.push(this.jumpUrl)
      } else {
        throw new Error("push called on empty PermittedSuggestion!")
      }
      query.push(toUpdate.join(", "))
      
      query.push("WHERE suggestion_id = ?")
      params.push(this.recordId)
      
      // Run query
      await db.run(query.join(" "), params)
    } catch (DatabaseError) {
      console.error(DatabaseError)
    }
  }
}




/*
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
*/




/*-------*\
  EXPORTS
\*-------*/
module.exports = {
  PermittedEpisode, PermittedAuthor, PermittedSuggestion,
  getCurrentEpNum: async() => {
    await assureLoaded();

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
  addNewEpisode: async(epNum)=>{
    let permittedEpisode = new PermittedEpisode({epNum});
    return await permittedEpisode.push()
  },
  addNewSuggestion: async(episode, author, suggestion)=>{
    await assureLoaded();
    
    let permittedEpisode = new PermittedEpisode(episode);
    await permittedEpisode.push()

    let permittedAuthor = new PermittedAuthor(author);
    await permittedAuthor.push()

    let permittedSuggestion = new PermittedSuggestion(suggestion);
    permittedSuggestion.permit({
      episodeId: permittedEpisode.recordId,
      authorId: permittedAuthor.recordId
    })
    await permittedSuggestion.push();                        
  },
  mock: {
    author:     {discordId:18695631,
                 name:"Ben",
                 nick:"bennie"},
    episode:    {epNum:999},
    suggestion: {messageId: 82340,
                 suggestion: "Test title test",
                 jumpUrl: "http://.com"},
  }
};

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

