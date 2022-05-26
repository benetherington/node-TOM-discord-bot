const {
    getSuggestionsWithCountedVotes,
    getCurrentEpNum,
} = require('../../database/suggestions');
const {startNewVoteFromApi} = require('../../title-suggestions/api/vote');
const {
    addNewSuggestionFromApi,
    removeSuggestionFromApi,
} = require('../../title-suggestions/api/title-suggestions');
const {adminPreHandler} = require('./loginUtilities');

module.exports = (fastify, opts, done) => {
    // Suggestion monitor
    fastify.get('/', {preHandler: adminPreHandler}, (_, reply) =>
        reply.redirect('/titles'),
    );
    fastify.get(
        '/titles',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            const epNum = await getCurrentEpNum();
            return reply.view('src/views/titles', {
                username: request.admin.username,
                epNum,
            });
        },
    );

    // API: get suggestions
    fastify.get(
        '/api/titles/:epNum',
        {preHandler: adminPreHandler, logLevel: 'warn'},
        async (request, reply) => {
            let requestedEpNum = request.params.epNum; // getSuggestionsWCV defaults to current
            const [epNum, titles] = await getSuggestionsWithCountedVotes(
                {requestedEpNum},
                true,
            );
            return reply.send({epNum, titles});
        },
    );

    // API: add suggestion
    fastify.post(
        '/api/titles/:messageId',
        {preHandler: adminPreHandler},
        (request, reply) => {
            const messageId = request.params.messageId;
            addNewSuggestionFromApi(messageId)
                .then(() => reply.send(1))
                .catch((error) => {
                    request.log.error({error, messageId});
                    return reply.code(422); // unprocessable entity
                });
        },
    );

    // API: start vote
    fastify.post(
        '/api/vote',
        {preHandler: adminPreHandler},
        (request, reply) => {
            startNewVoteFromApi();
            reply.send(1);
        },
    );

    // API: delete suggestion
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
