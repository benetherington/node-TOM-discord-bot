const {getAdminByToken} = require('../sqlite/admin.js');

const getAdminOrErrorFromToken = async (authCookie) => {
    // Token must exist
    if (!authCookie) {
        return {errorMessage: 'You must log in to do that.'};
    }

    // Token must be valid
    try {
        const admin = await getAdminByToken(authCookie);
        // If admin is null, the token is valid, but the admin doesn't exist in
        // the db. This is not an expected situation.
        if (!admin) throw 'JWT valid, but admin record not found';

        return {admin};
    } catch (error) {
        if (error.message === 'jwt expired') {
            return {
                errorMessage: 'Your credentials expired. Please log in again.',
            };
        } else {
            console.error(error);
            return {errorMessage: 'You must log in to do that.'};
        }
    }
};
module.exports.getAdminOrErrorFromToken = getAdminOrErrorFromToken;

module.exports.adminPreHandler = async (request, reply) => {
    const {admin, errorMessage} = await getAdminOrErrorFromToken(
        request.cookies.auth,
    );

    if (admin) {
        request.admin = admin;
    } else {
        // "Redirect" to login
        return reply.view('src/views/login', {
            errorMessage,
        });
    }
};
