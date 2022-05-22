const {adminPreHandler} = require('./loginUtilities');

const {
    scoreGuess,
    getUnscoredGuesses,
    getCorrectGuesses,
    guessTypes,
} = require('../../database/twsf');

module.exports = (fastify, opts, done) => {
    // Guess viewer
    fastify.get(
        '/twsf',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            reply.locals = {guessTypes: JSON.stringify(guessTypes)};
            return reply.view('src/views/twsf', {
                username: request.admin.username,
            });
        },
    );

    // API: get this week's guesses
    fastify.get(
        '/api/twsf/unscored',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            const guesses = await getUnscoredGuesses();
            console.log(`Found ${guesses.length} unscored TWSF guesses.`);

            reply.send(guesses);
        },
    );
    fastify.get(
        '/api/twsf/correct',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            const guesses = await getCorrectGuesses();
            console.log(
                `Found ${guesses.length} correct guesses for this episode.`,
            );

            reply.send(guesses);
        },
    );

    // API: score guesses
    fastify.post(
        '/api/twsf/score',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            const guess = request.body;
            console.log(guess);

            // Update guess
            const update = await scoreGuess(guess);
            if (update.changes === 1) reply.send(1);
            else return reply.code(422); // unprocessable entity
        },
    );

    done();
};
