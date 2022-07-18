const path = require('path');

module.exports = (fastify, opts, done) => {
    // Icons
    fastify.register(require('@fastify/static'), {
        root: path.resolve('./src/views/icons'),
        prefix: '/icons/',
        wildcard: true,
        logLevel: 'warn',
    });

    done();
};
