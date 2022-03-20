// Glitch handles its own env
try {require('dotenv').config()}
catch (ReferenceError) {console.log("oh hey we must be running on Glitch")}

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbFile = require('path').resolve("./.data/admin.db");
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");

const config = require("../config.json");



/*-------*\
DB INIT
\*-------*/
const printDbSummary = async ()=>{
    try {
        const selectTables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        const exists = selectTables.map(row=>row.name).join(", ");
        console.log(`Tables: ${exists}`)
        
        const administrators = await db.all(
           `SELECT COUNT (*)
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

let db;
const migrationsPath = "./migrations/admin";
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
const hashPassword = async (admin)=>{
    // Takes an admin object, removes the password property, and adds/updates
    // the hashed password property.
    const hashedPassword = await bcrypt.hash(
        admin.password,
        config.admin.bcryptSaltRounds
    );
    delete admin.password;
    admin.hashedPassword = hashedPassword;
    return admin;
};
const verifyPassword = async (admin, attemptedPassword)=>{
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
        {administratorId: admin.administratorId.toString()},
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
const preSave = async (admin)=>{
    // Takes an admin object and prepares it to be saved to the database.
    // RUN THIS BEFORE PUTTING ANYTHING IN ADMINISTRATORS TABLE!
    if (admin.password) await hashPassword(admin);
    return admin;
};


/*-------*\
  EXPORTS
\*-------*/
// GETTERS
module.exports.getAdminByToken = (token)=>{
    // Takes a token. If the token is valid, returns the associated
    // Administrator. If the token is invalid, throws an error.
    const admin = verifyToken(token);
    return db.get(
       `SELECT * FROM Administrators
        LEFT JOIN Administrator_Tokens USING(administratorId)
        WHERE token = ?
        AND administratorId = ?`,
        token, admin.administratorId
    )
}
module.exports.getAdminByCredentials = async (username, password)=>{
    const admin = await db.get(
       `SELECT *
        FROM Administrators
        WHERE username = ?`,
        username
    );
    if (!admin) return;
    
    await verifyPassword(admin, password)
    return admin;
}

//SETTERS
module.exports.createToken = async (admin)=>{
    const token = generateToken(admin);
    const inserted = await db.run(
       `INSERT INTO Administrator_Tokens
            (administratorId, token)
        VALUES (?, ?);`,
        admin.administratorId, token
    )
    if (inserted) return token;
}
module.exports.updatePassword = async (admin, newPassword)=>{
    verifyPassword(admin, password)
    admin.password = newPassword;
    await preSave(admin)
    return db.run(
       `UPDATE Administrators
        SET hashedPassword = ?
        WHERE administratorId = ?;`,
        newHashed, admin.administratorId
    )
}
