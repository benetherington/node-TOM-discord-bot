// Glitch handles its own env
try {require('dotenv').config()}
catch (ReferenceError) {console.log("oh hey we must be running on Glitch")}

const config = require("config.json");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbFile = require('path').resolve("./.data/admin.db");
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
const { decode } = require('punycode');
let db;



/*-------*\
  DB INIT
\*-------*/
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
    // Takes an admin object, removes the password property, and adds/updates
    // the hashed password property.
    const hashedPassword = await bcrypt.hash(
        admin.password,
        config.admin.bcryptSaltRounds
    );
    delete admin.password;
    admin.hashedPassword = hashedPassword;
    return hashedPassword;
};
const verifyPassword = (admin, attemptedPassword)=>{
    // Takes an admin object and a password attempt. If the password is valid,
    // returns true. If the password is invalid, throws an error.
    const passwordValid = await bcrypt.compare(
        attemptedPassword, admin.hashedPassword
    );
    if (!passwordValid) {
        console.log(`Failed authentication for ${username}`)
        throw new Error("password invalid");
    } else {
        return true;
    }
};
const generateToken = (admin)=>{
    // Takes an admin object and returns a signed JSON Web Token.
    const token = jwt.sign(
        {id: admin.administratorId.toString()},
        process.env.JWT_SECRET,
        {expiresIn: config.admin.tokenExpiration}
    );
    return token;
};
const verifyToken = (token)=>{
    // Takes a JSON Web Token. If the token is valid, returns the decoded data.
    // If the token is invalid, throws an error.
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) throw new Error("token invalid");
    return decodedToken;
};




/*--------------*\
  AUTHENTICATION
\*--------------*/
const preSave = (admin)=>{
    // Takes an admin object and prepares it to be saved to the database.
    // RUN THIS BEFORE PUTTING ANYTHING IN ADMINISTRATORS TABLE!
    if (admin.password) hashPassword(admin);
    return admin;
};


/*-------*\
  EXPORTS
\*-------*/
// GETTERS
module.exports.findAdminByToken = (token)=>{
    // Takes a token. If the token is valid, returns the associated
    // Administrator. If the token is invalid, throws an error.
    const {administratorId} = verifyToken(token);
    return db.get(
       `SELECT * FROM Administrators
        LEFT JOIN Administrators_Tokens USING(administratorId)
        WHERE token = ?
        AND administratorId = ?`,
        token, administratorId
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
module.exports.createToken = (admin)=>{
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
