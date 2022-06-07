require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const dbWrapper = require('sqlite');

const logger = require('../logger');

const dbFile = require('path').resolve('./.data/admin.db');
const migrationsPath = './database/migrations/admin';
let db;

/*-------*\
  DB INIT
\*-------*/
const printDbSummary = async () => {
    try {
        const selectTables = await db.all(
            "SELECT name FROM sqlite_master WHERE type='table'",
        );
        const exists = selectTables.map((row) => row.name).join(', ');
        logger.info(`Tables: ${exists}`);

        const administrators = await db.all(
            `SELECT COUNT (*)
            FROM Administrators`,
        );
        if (administrators.count) {
            logger.info(`There are ${administrators.count} admins.`);
        } else {
            logger.info('No admin users exist yet.');
        }
    } catch (error) {
        logger.error(
            'There was an issue initializing the administrators database.',
            {error},
        );
    }
};

const initDB = async () => {
    logger.info('SQLite');
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database,
    });
    logger.info('Migrating admin...');
    await db.migrate({migrationsPath});
};
initDB().then(printDbSummary);

/*-------*\
  EXPORTS
\*-------*/
// GETTERS
module.exports.getAdminById = (admin) =>
    db.get(
        `SELECT * FROM Administrators
        WHERE administratorId = ?`,
        admin.administratorId,
    );
module.exports.getAdminByUsername = (username) =>
    db.get(
        `SELECT *
        FROM Administrators
        WHERE username = ?`,
        username,
    );

// SETTERS
// module.exports.updatePassword = async (admin, newPassword) => {
//     verifyPassword(admin, password);
//     admin.password = newPassword;
//     await preSave(admin);
//     return db.run(
//         `UPDATE Administrators
//         SET hashedPassword = ?
//         WHERE administratorId = ?;`,
//         newHashed,
//         admin.administratorId,
//     );
// };
