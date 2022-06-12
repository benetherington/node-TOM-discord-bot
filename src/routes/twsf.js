const {adminPreHandler} = require('./loginUtilities');

const {
    scoreGuess,
    getUnscoredGuesses,
    getCorrectGuesses,
    guessTypes,
} = require('../../database/twsf');
const {getCurrentEpNum} = require('../../database/suggestions');
const {getChatThanks} = require('../../database/thankyou');

module.exports = (fastify, opts, done) => {
    // Guess viewer
    fastify.get(
        '/twsf',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            const epNum = await getCurrentEpNum();
            return reply.view('src/views/twsf', {
                username: request.admin.username,
                guessTypes: JSON.stringify(guessTypes),
                epNum,
            });
        },
    );

    // API: get this week's guesses
    fastify.get(
        '/api/twsf/unscored',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            const guesses = await getUnscoredGuesses();
            const epNum = await getCurrentEpNum();
            request.logger.info(`Found ${guesses.length} unscored TWSF guesses.`);

            reply.send({guesses, epNum});
        },
    );
    fastify.get(
        '/api/twsf/correct',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            const guesses = await getCorrectGuesses();
            const epNum = await getCurrentEpNum();
            request.logger.info(
                `Found ${guesses.length} correct guesses for this episode.`,
            );

            reply.send({guesses, epNum});
        },
    );

    // API: get outro chat thank-yous
    fastify.get(
        '/api/twsf/thankyou',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            const thanks = await getChatThanks();
            reply.logger({thanks});
            reply.send(thanks);
        },
    );

    // API: score guesses
    fastify.post(
        '/api/twsf/score',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            const guess = request.body;
            request.logger.info(guess);

            // Update guess
            const update = await scoreGuess(guess);
            if (update.changes === 1) reply.send(1);
            else return reply.code(422); // unprocessable entity
        },
    );

    done();
};
