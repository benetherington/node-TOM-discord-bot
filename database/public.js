const sqlite3 = require('sqlite3').verbose();
const dbWrapper = require('sqlite');

const logger = require('../logger');

const dbFile = require('path').resolve('./.data/title-suggestions.db');
const migrationsPath = './database/migrations/public';

module.exports = new Promise(async (resolve) => {
    logger.info('Opening public DB...');
    const db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database,
    });

    logger.info('Migrating public DB...');
    await db.migrate({migrationsPath});
    resolve(db);
});
