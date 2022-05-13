const {getSuggestionsWithCountedVotes} = require('../../database/suggestions');
const {startNewVoteFromApi} = require('../webhook-handlers/vote');
const {
    addNewSuggestionFromApi,
    removeSuggestionFromApi,
} = require('../webhook-handlers/title-suggestions');
const {adminPreHandler} = require('./loginUtilities');

module.exports = (fastify, opts, done) => {
    // Allow adminPreHandler to pass the admin object to route handlers.
    fastify.decorateRequest('admin', null);

    // Suggestion monitor
    fastify.get('/', {preHandler: adminPreHandler}, async (request, reply) => {
        return reply.view('src/views/monitor', {
            username: request.admin.username,
        });
    });

    // API: get suggestions
    fastify.get(
        '/api/titles/:epNum',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            const epNum = request.params.epNum;
            const countedSuggestions = await getSuggestionsWithCountedVotes({
                epNum,
            });
            if (countedSuggestions.length) {
                return reply.send(countedSuggestions);
            } else {
                return reply.code(406).send() // 406: not acceptable
            }
        },
    );

    // API: edit suggestions
    fastify.post(
        '/api/titles/:messageId',
        {preHandler: adminPreHandler},
        (request, reply) => {
            const messageId = request.params.messageId;
            addNewSuggestionFromApi(messageId);
            reply.send(1);
        },
    );
    fastify.post(
        '/api/vote',
        {preHandler: adminPreHandler},
        (request, reply) => {
            startNewVoteFromApi();
            reply.send(1);
        },
    );
    fastify.delete(
        '/api/titles/:messageId',
        {preHandler: adminPreHandler},
        (request, reply) => {
            removeSuggestionFromApi(request.params.messageId);
            reply.send(1);
        },
    );

    done();
};
