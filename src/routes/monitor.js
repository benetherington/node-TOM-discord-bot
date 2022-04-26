const {getSuggestionsWithCountedVotes} = require('../sqlite/suggestions.js');
const {startNewVoteFromApi} = require('../../interface/vote-interface.js');
const {
    addNewSuggestionFromApi,
    removeSuggestionFromApi,
} = require('../../interface/title-interface.js');
const {getAdminFromTokenOrRedirect} = require('./loginUtilities.js');

module.exports = (fastify, opts, done) => {
    // Suggestion monitor
    fastify.get('/', async (request, reply) => {
        const admin = await getAdminFromTokenOrRedirect(request, reply);
        reply.view('src/views/monitor', {username: admin.username});
    });

    // XML: get suggestions
    fastify.get('/api/titles/:epNum', async (request, reply) => {
        getAdminFromTokenOrRedirect(request, reply);

        const epNum = request.params.epNum;
        const countedSuggestions = await getSuggestionsWithCountedVotes({
            epNum,
        });
        if (!countedSuggestions) throw new Error('invalid');
        return countedSuggestions;
    });

    // XML: edit suggestions
    fastify.post('/api/titles/:messageId', (request, reply) => {
        getAdminFromTokenOrRedirect(request, reply);

        const messageId = request.params.messageId;
        addNewSuggestionFromApi(messageId);
        reply.send(1);
    });
    fastify.post('/api/vote', (request, reply) => {
        getAdminFromTokenOrRedirect(request, reply);

        startNewVoteFromApi();
        reply.send(1);
    });
    fastify.delete('/api/titles/:messageId', (request, reply) => {
        getAdminFromTokenOrRedirect(request, reply);

        removeSuggestionFromApi(request.params.messageId);
        reply.send(1);
    });

    done();
};
