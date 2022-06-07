require('dotenv').config();

const storeNewTwsfEmail = require('../../twsf/email');

module.exports = (fastify, opts, done) => {
    fastify.post('/twsf-email', async (request, reply) => {
        request.log.info('Incoming TWSF email!');

        try {
            // Grab data from header
            const authHeader = request.headers.authorization;
            // Format and encode the correct credentials. This seems easier than
            // parsing the received header and atob-ing its value. ¯\_(ツ)_/¯
            const credentials =
                process.env.EMAIL_ENDPOINT_USERNAME +
                ':' +
                process.env.EMAIL_ENDPOINT_PASSWORD;
            const expectedAuth = `Basic ${btoa(credentials)}`;
            // Check that the request is valid
            if (authHeader !== expectedAuth) {
                request.log.info('Bad auth provided to POST /twsf-email!');
                return reply.status(401).send(); // 401: not authorized
            }

            // Grab sender's address from body
            const from = request.body.envelope.from;
            // Check that it's from Ben. For now, we won't be collecting emails
            // directly from listeners. This isn't perfectly secure, but might
            // save a headache in the future.
            if (from !== 'zoundspadang@gmail.com') {
                request.log.info("Email didn't come from Ben");
                return reply.status(401).send(); // 401: not authorized
            }

            // Grab plaintext from body
            const textContent = request.body.plain;
            // Hand content off for parsing and storage
            storeNewTwsfEmail(textContent);

            // Return success
            return reply.send(1);
        } catch (error) {
            request.log.error(
                'Error encountered while processing TWSF email:',
                {
                    error,
                },
            );
            return reply.error(500).send();
        }
    });

    done();
};
