const sqlite3 = require('sqlite3').verbose();
const dbWrapper = require('sqlite');

const dbFile = require('path').resolve('./.data/title-suggestions.db');
const migrationsPath = './database/migrations/public';

module.exports = new Promise(async (resolve) => {
    console.log('Opening public DB...');
    const db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database,
    });

    console.log('Migrating public DB...');
    await db.migrate({migrationsPath});
    resolve(db);
});
