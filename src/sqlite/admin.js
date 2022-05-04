// Glitch handles its own env
try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}

const dbFile = require('path').resolve('./.data/admin.db');
const sqlite3 = require('sqlite3').verbose();
const dbWrapper = require('sqlite');

/*-------*\
DB INIT
\*-------*/
const printDbSummary = async () => {
    try {
        const selectTables = await db.all(
            "SELECT name FROM sqlite_master WHERE type='table'",
        );
        const exists = selectTables.map((row) => row.name).join(', ');
        console.log(`Tables: ${exists}`);

        const administrators = await db.all(
            `SELECT COUNT (*)
            FROM Administrators`,
        );
        if (administrators.count) {
            console.log(`There are ${administrators.count} admins.`);
        } else {
            console.log('No admin users exist yet.');
        }
    } catch (error) {
        console.error(
            'There was an issue initializing the administrators database.',
        );
        console.error(error);
    }
};

let db;
const migrationsPath = './migrations/admin';
const initDB = async () => {
    console.log('SQLite');
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database,
    });
    console.log('Migrating admin...');
    await db.migrate({migrationsPath});
    await printDbSummary();
};
initDB();

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
