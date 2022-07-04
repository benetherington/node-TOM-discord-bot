const {
    getAuthors,
    getAuthor,
    getAuthorsCount,
    updateAuthorCallsign,
    updateAuthorNotes,
    getMergedAuthor,
    executeAuthorMerge,
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

    // API: get a single Author
    fastify.get(
        '/api/author/:authorId',
        {preHander: adminPreHandler},
        async (request, reply) => {
            const {authorId} = request.params;
            const author = await getAuthor(authorId);
            return reply.send(author);
        },
    );
    // API: get Authors
    fastify.get(
        '/api/authors',
        {preHander: adminPreHandler},
        async (request, reply) => {
            const {offset, limit} = request.query;
            const authors = await getAuthors(limit, offset);
            const {count} = await getAuthorsCount();
            return reply.send({authors, count});
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
    // API: preview Author merge
    fastify.post(
        '/api/authors/merge/preview',
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
            const mergePreview = await getMergedAuthor(
                authorKeep,
                authorDelete,
            );
            mergePreview.authorId = authorKeep.authorId;
            return reply.send(mergePreview);
        },
    );
    // API: merge Authors
    fastify.post(
        '/api/authors/merge/execute',
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
            // TODO: should preview values be included in the request, and
            // double checked? This would ensure we've got the correct IDs and
            // that nothing has changed.
            const success = await executeAuthorMerge(authorKeep, authorDelete);
            return reply.send(success);
        },
    );

    done();
};
