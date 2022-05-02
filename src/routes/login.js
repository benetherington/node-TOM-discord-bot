const {
    getAdminByCredentials,
    createToken,
    deleteTokensFromAdmin,
} = require('../sqlite/admin.js');
const {getAdminOrErrorFromToken} = require('./loginUtilities');

module.exports = (fastify, opts, done) => {
    fastify.get('/login', async (request, reply) =>
        reply.view('src/views/login'),
    );

    fastify.post('/login', async (request, reply) => {
        // Authenticate administrator
        const username = request.body.username;
        const password = request.body.password;
        const adminUser = await getAdminByCredentials(username, password);

        if (adminUser) {
            // Good credentials, create an authentication token
            const token = await createToken(adminUser);
            return reply.setCookie('auth', token).redirect('/');
        } else {
            // Bad credentials, redirect
            reply.redirect('/login?auth=failed');
        }

    });

    fastify.post('/logout', async (request, reply) => {
        // Authenticate administrator
        const {admin} = getAdminOrErrorFromToken(request.cookies.auth);

        // Delete tokens from database
        if (admin) await deleteTokensFromAdmin(admin);

        return reply
            .clearCookie('auth') // Remove cookie
            .redirect('/login'); // redirect to login page
    });

    done();
};
