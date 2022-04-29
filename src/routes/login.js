const {
    getAdminByCredentials,
    createToken,
    deleteTokensFromAdmin,
} = require('../sqlite/admin.js');
const {getAdminFromTokenOrRedirect} = require('./loginUtilities');

module.exports = (fastify, opts, done) => {
    fastify.get('/login', async (request, reply) => {
        return reply.view('src/views/login');
    });

    fastify.post('/login', async (request, reply) => {
        // Authenticate administrator
        const username = request.body.username;
        const password = request.body.password;
        const adminUser = await getAdminByCredentials(username, password);

        // Redirect if bad credentials
        if (!adminUser) reply.redirect('/login?auth=failed');

        // Create an authentication token
        const token = await createToken(adminUser);
        reply.setCookie('auth', token).redirect('/');
    });

    fastify.post('/logout', async (request, reply) => {
        // Authenticate administrator
        const admin = getAdminFromTokenOrRedirect(request, reply);

        // Delete tokens from database
        await deleteTokensFromAdmin(admin);

        reply
            .clearCookie('auth') // Remove cookie
            .redirect('/login'); // redirect to login page
    });

    done();
};
