const {adminPreHandler} = require('./loginUtilities');

const {scoreTwsfGuess} = require('../../database/twsf');

module.exports = (fastify, opts, done) => {
    // Guess viewer
    fastify.get(
        '/twsf',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            return reply.view('src/views/twsf', {
                username: request.admin.username,
            });
        },
    );

    // API: get this week's guesses
    fastify.get(
        '/api/twsf/new',
        {preHandler: adminPreHandler},
        (request, reply) => {},
    );

    // API: score a guess
    fastify.post(
        '/api/twsf/score',
        {preHandler: adminPreHandler},
        async (request, reply) => {
            const guesses = request.body;
            console.log(guesses);

            // Update guesses in DB
            let errors = guesses.map(async (guess) => {
                try {
                    const update = await scoreTwsfGuess(guess);
                    if (update.changes === 1) return false;
                } catch {}
                // something went wrong
                console.error('Something went wrong updating guess score.');
                console.error(guess);
                return guess.guessId;
            });
            errors = await Promise.all(errors);

            // Return status update
            if (errors.every((g) => g)) {
                // Everything failed
                return reply.code(422); // unprocessable entity
            }
            errors = errors.filter((g) => g).map((g) => g.guessId);
            if (errors.length) {
                // Something failed
                reply
                    .status(207) // multi-status
                    .send(errors);
            } else {
                // Nothing failed
                reply.send(1);
            }
        },
    );

    done();
};
