const {getAdminByToken} = require('../sqlite/admin.js');

module.exports.getAdminFromTokenOrRedirect = async (request, reply) => {
    // Token must exist
    if (!request.cookies.auth) {
        reply.redirect('/login?auth=none');
    }

    // Token must be valid
    let admin;
    try {
        admin = await getAdminByToken(request.cookies.auth);
        if (!admin) reply.redirect('/login?auth=none');
    } catch (error) {
        if (error.message === 'jwt expired') {
            reply.clearCookie('auth').redirect('/login?auth=expired');
        }
    }

    return admin;
};
