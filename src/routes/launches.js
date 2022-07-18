const {adminPreHandler} = require('./loginUtilities');

module.exports = (fastify, opts, done) => {
    fastify.get(
        '/launches',
        {preHandler: adminPreHandler},
        (request, reply) => {
            return reply.view('src/views/launches', {
                username: request.admin.username,
            });
        },
    );
    
    done()
};
