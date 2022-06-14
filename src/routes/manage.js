const {
    getAuthors,
    updateAuthorCallsign,
    updateAuthorNotes,
    mergeAuthors,
} = require('../../database/author');
const {adminPreHandler} = require('./loginUtilities');

module.exports = (fastify, opts, done) => {
    // Objects viewer
    fastify.get(
        '/manage',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            return reply.view('src/views/manage', {
                username: request.admin.username,
            });
        },
    );

    // API: get Authors
    fastify.get(
        '/api/authors',
        {preHander: adminPreHandler},
        async (request, reply) => {
            const {offset, limit} = request.query;
            const authors = await getAuthors(limit, offset);
            return reply.send(authors);
        },
    );
    // API: update callsign
    fastify.post(
        '/api/authors/callsign',
        {
            preHander: adminPreHandler,
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        authorId: {type: 'string'},
                        callsign: {type: 'string'},
                        additionalProperties: true,
                    },
                },
            },
        },
        async (request, reply) => {
            const author = request.body;
            const {changes} = await updateAuthorCallsign(author);
            return reply.send(changes);
        },
    );
    // API: update notes
    fastify.post(
        '/api/authors/notes',
        {
            preHander: adminPreHandler,
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        authorId: {type: 'string'},
                        notes: {type: 'string'},
                        additionalProperties: true,
                    },
                },
            },
        },
        async (request, reply) => {
            const author = request.body;
            const {changes} = await updateAuthorNotes(author);
            return reply.send(changes);
        },
    );
    // API: merge Authors
    fastify.post(
        '/api/authors/merge',
        {
            preHander: adminPreHandler,
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        authorKeep: {
                            type: 'object',
                            properties: {authorId: {type: 'string'}},
                            additionalProperties: true,
                        },
                        authorDelete: {
                            type: 'object',
                            properties: {authorId: {type: 'string'}},
                            additionalProperties: true,
                        },
                        additionalProperties: false,
                    },
                },
            },
        },
        async (request, reply) => {
            const {authorKeep, authorDelete} = request.body;
            const success = await mergeAuthors(authorKeep, authorDelete);
            return reply.send(success);
        },
    );

    done();
};
