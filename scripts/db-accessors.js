require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const dbWrapper = require('sqlite');

module.exports.admin = async () => {
    const dbFile = require('path').resolve('./.data/admin.db');
    const migrationsPath = './database/migrations/admin';
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database,
    });
    await db.migrate({migrationsPath});
    return db;
};

module.exports.public = async () => {
    const dbFile = require('path').resolve('./.data/title-suggestions.db');
    const migrationsPath = './database/migrations/public';
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database,
    });
    await db.migrate({migrationsPath});
    return db;
};
