const {
    getAdminByCredentials,
    createAuthCookie,
} = require('./loginUtilities');

module.exports = (fastify, opts, done) => {
    fastify.get('/login', async (request, reply) =>
        reply.view('../views/login'),
    );

    fastify.post('/login', async (request, reply) => {
        // Authenticate administrator
        const username = request.body.username;
        const password = request.body.password;
        const admin = await getAdminByCredentials(username, password);

        if (admin) {
            // Good credentials, create an authentication token
            const authCookie = await createAuthCookie(admin);
            return reply.setCookie('auth', authCookie).redirect('/');
        } else {
            // Bad credentials, redirect
            reply.view('../views/login', {
                errorMessage: 'Wrong username or password.',
            });
        }
    });

    fastify.post('/logout', async (request, reply) => {
        return reply
            .clearCookie('auth') // Remove cookie
            .redirect('/login'); // redirect to login page
    });

    done();
};
