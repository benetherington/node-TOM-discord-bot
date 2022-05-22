const {getAdminByCredentials, createAuthCookie} = require('./loginUtilities');

module.exports = (fastify, opts, done) => {
    // Allow adminPreHandler to pass the admin object to route handlers.
    fastify.decorateRequest('admin', null);

    fastify.get('/login', async (request, reply) =>
        reply.view('src/views/login'),
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
            reply.view('src/views/login', {
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
