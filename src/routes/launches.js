require('dotenv').config();
const {adminPreHandler} = require('./loginUtilities');

const useLL2TestApi = process.env.NODE_ENV === 'development';

module.exports = (fastify, opts, done) => {
    fastify.get(
        '/launches',
        {preHandler: adminPreHandler},
        (request, reply) => {
            return reply.view('src/views/launches', {
                username: request.admin.username,
                useLL2TestApi,
            });
        },
    );

    done();
};
