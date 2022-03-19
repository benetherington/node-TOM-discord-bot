require('dotenv').config()

const dbFile = require('path').resolve("./.data/admin.db");
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");


module.exports.admin = async ()=>{
    const dbFile = require('path').resolve("./.data/admin.db");
    const migrationsPath = "./migrations/admin";
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database
    });
    await db.migrate({migrationsPath})
    return db;
}

module.exports.suggestions = async ()=>{
    const dbFile = require('path').resolve("./.data/title-suggestions.db");
    const migrationsPath = "./migrations/title-suggestions";
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database
    });
    await db.migrate({migrationsPath})
    return db;
}

