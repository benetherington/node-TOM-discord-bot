const sqlite3 = require('sqlite3').verbose();
const dbWrapper = require('sqlite');

const logger = require('../logger');

const dbFile = require('path').resolve('./.data/title-suggestions.db');
const migrationsPath = './database/migrations/public';

const printDbSummary = async (db) => {
    const selectTables = await db.all(
        "SELECT name FROM sqlite_master WHERE type='table';",
    );
    const tables = selectTables.map((row) => row.name).join(', ');
    logger.info({tables});
};

module.exports = new Promise(async (resolve) => {
    logger.info('Opening public DB...');
    const db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database,
    });

    logger.info('Migrating public DB...');
    await db.migrate({migrationsPath});
    printDbSummary(db);

    resolve(db);
});
