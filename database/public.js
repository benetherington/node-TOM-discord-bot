const sqlite3 = require('sqlite3').verbose();
const dbWrapper = require('sqlite');

const dbFile = require('path').resolve('./.data/title-suggestions.db');
const migrationsPath = './database/migrations/public';
let db;

module.exports = async () => {
    if (db) return db;
    
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database,
    });
    console.log('Migrating public DB...');
    await db.migrate({migrationsPath});
    
    return db;
};
