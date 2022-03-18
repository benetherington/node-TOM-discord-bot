// Glitch handles its own env
try {require('dotenv').config()}
catch (ReferenceError) {console.log("oh hey we must be running on Glitch")}

const config = require("config.json");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbFile = require('path').resolve("./.data/admin.db");
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
let db;



/*---------*\
  UTILITIES
\*---------*/
const printDbSummary = async ()=>{
    try {
        const selectTables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        const exists = selectTables.map(row=>row.name).join(", ");
        console.log(`Tables: ${exists}`)

        const administrators = await db.all(
           `COUNT (*)
            FROM Administrators`
        );
        if (administrators.count) {
            console.log(`There are ${administrators.count} admins.`)
        } else {
            console.log("No admin users exist yet.")
        }
    } catch (error) {
            console.error("There was an issue initializing the administrators database.")
            console.error(error)
    }
}


/*-------*\
  DB INIT
\*-------*/
const migrationsPath = "../migrations/admin";
const initDB = async ()=>{
    console.log("SQLite")
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database
    });
    console.log("Migrating admin...")
    await db.migrate({migrationsPath})
    await printDbSummary()
}
initDB();


/*--------------*\
  AUTH UTILITIES
\*--------------*/
const hashPassword = (admin)=>{
    const hashedPassword = await bcrypt.hash(
        admin.password,
        config.admin.bcryptSaltRounds
    );
    delete admin.password;
    admin.hashedPassword = hashedPassword;
    return hashedPassword;
};
const verifyPassword = (admin, attemptedPassword)=>{
    const passwordValid = await bcrypt.compare(
        attemptedPassword, admin.hashedPassword
    );
    if (!passwordValid) {
        console.log(`Failed authentication for ${username}`)
        throw new Error("password invalid");
    }
};
const generateToken = (admin)=>{
    const token = jwt.sign(
        {id: admin.administratorId.toString()},
        process.env.JWT_SECRET,
        {expiresIn: config.admin.tokenExpiration}
    );
    return token;
};



/*--------------*\
  AUTHENTICATION
\*--------------*/
const preSave = (admin)=>{
    if (admin.password) hashPassword(admin);
    return admin;
};


/*-------*\
  EXPORTS
\*-------*/
// GETTERS
module.exports.findAdminByToken = (token)=>{
    const decodedAdmin = jwt.verify(token, process.env.JWT_SECRET);
    return db.get(
       `SELECT * FROM Administrators
        LEFT JOIN Administrators_Tokens USING(administratorId)
        WHERE token = ?
        AND administratorId = ?`,
        token, decodedAdmin.administratorId
    )
}
module.exports.findAdminByCredentials = async (username, password)=>{
    const admin = await db.get(
       `SELECT *
        FROM Administrators
        WHERE username = ?'`,
        username
    );
    verifyPassword(admin, password)
    return admin;
}

//SETTERS
const createToken = (admin)=>{
    const token = generateToken(admin);
    return db.run(
       `INSERT INTO Administrators_Tokens
            (administratorId, token)
        VALUES (?, ?);`,
        admin.administratorId, token
    )
}
module.exports.updatePassword = (admin, newPassword)=>{
    verifyPassword(admin, password)
    admin.password = newPassword;
    preSave(admin)
    return db.run(
       `UPDATE Administrators
        SET hashedPassword = ?
        WHERE administratorId = ?;`,
        newHashed, admin.administratorId
    )
}
