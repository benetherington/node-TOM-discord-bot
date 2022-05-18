const path = require('path');

module.exports = (fastify, opts, done) => {
    // STATIC ROUTES
    fastify.register(require('@fastify/static'), {
        root: path.join(__dirname, 'src/views/icons'),
        prefix: '/icons/',
        wildcard: true,
    });

    done();
};
