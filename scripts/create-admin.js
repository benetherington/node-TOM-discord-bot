const config = require('./config/website.json');
const bcrypt = require('bcrypt');
try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}
const sqlite3 = require('sqlite3').verbose();
const dbWrapper = require('sqlite');

const dbFile = require('path').resolve('./.data/admin.db');
const migrationsPath = './database/migrations/admin';

const hashPassword = async (admin) => {
    // Takes an admin object, removes the password property, and adds/updates
    // the hashed password property.
    const hashedPassword = await bcrypt.hash(
        admin.password,
        config.admin.bcryptSaltRounds,
    );
    delete admin.password;
    admin.hashedPassword = hashedPassword;
    return admin;
};
const admin = {username, password};
hashPassword(admin);

const insertAdmin = async () => {
    const db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database,
    });
    await db.migrate({migrationsPath});
    const existingCount = await db.get('SELECT COUNT(*) FROM Administrators');
    console.log(`There are currently ${existingCount['COUNT(*)']} admins.`);

    await db.run(
        `INSERT INTO Administrators (username, hashedPassword) VALUES (?,?)`,
        admin.username,
        admin.hashedPassword,
    );

    const newCount = await db.get('SELECT COUNT(*) FROM Administrators');
    console.log(`There are now ${newCount['COUNT(*)']} admins.`);
};

insertAdmin();
