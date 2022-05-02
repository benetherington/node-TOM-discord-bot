const {getAdminByToken} = require('../sqlite/admin.js');

const getAdminOrErrorFromToken = async (authCookie) => {
    // Token must exist
    if (!authCookie) {
        return {authError: 'none'};
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
            return {authError: 'expired'};
        } else {
            console.error(error);
            return {authError: 'none'};
        }
    }
};
module.exports.getAdminOrErrorFromToken = getAdminOrErrorFromToken;

module.exports.adminPreHandler = async (request, reply) => {
    const {admin, authError} = await getAdminOrErrorFromToken(request.cookies.auth);

    if (admin) {
        request.admin = admin;
    } else {
        return reply.redirect(`/login?auth=${authError}`);
    }
};
