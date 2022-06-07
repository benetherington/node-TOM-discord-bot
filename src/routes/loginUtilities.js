require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const {getAdminById, getAdminByUsername} = require('../../database/admin');
const config = require('../../config/website.json');

// const hashPassword = async (admin) => {
//     // Takes an admin object, removes the password property, and adds/updates
//     // the hashed password property.
//     const hashedPassword = await bcrypt.hash(
//         admin.password,
//         config.admin.bcryptSaltRounds,
//     );
//     delete admin.password;
//     admin.hashedPassword = hashedPassword;
//     return admin;
// };

getAdminOrErrorFromCookie = async (authCookie) => {
    // Cookie must exist
    if (!authCookie) {
        return {errorMessage: 'You must log in to do that.'};
    }

    // Cookie must be valid
    let administratorId;
    try {
        ({administratorId} = await jwt.verify(
            authCookie,
            process.env.JWT_SECRET,
        ));
    } catch (error) {
        if (error.message === 'jwt expired') {
            return {
                errorMessage: 'Your credentials expired. Please log in again.',
            };
        } else throw error;
    }

    // Fetch admin from database
    const admin = await getAdminById({administratorId});
    // If admin is null, the token is valid, but the admin doesn't exist in
    // the db. This is not an expected situation.
    if (!admin) throw 'JWT valid, but admin record not found';

    delete admin.hashedPassword;
    return {admin};
};

module.exports.getAdminByCredentials = async (username, password) => {
    // Look up username
    const admin = await getAdminByUsername(username);
    if (!admin) {
        request.log.info(`Non-existent admin ${username}.`);
        return false;
    }

    // Check password
    const passwordValid = await bcrypt.compare(password, admin.hashedPassword);
    if (passwordValid) return admin;
    else {
        request.log.info(`Bad password for ${username}.`);
        return false;
    }
};
module.exports.createAuthCookie = (admin) =>
    jwt.sign(admin, process.env.JWT_SECRET, {
        expiresIn: config.admin.tokenExpiration,
    });
module.exports.adminPreHandler = async (request, reply) => {
    const {admin, errorMessage} = await getAdminOrErrorFromCookie(
        request.cookies.auth,
    );

    if (admin) {
        // Make the admin available to handler
        request.admin = admin;
    } else {
        // Clear authCookie and "redirect" to login
        return reply.clearCookie('auth').view('src/views/login', {
            errorMessage,
        });
    }
};
