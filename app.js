/*---*\
  BOT
\*---*/
require('./bot');

/*-------*\
  TWITTER
\*-------*/
const schedule = require('node-schedule');
const storeNewTwsfTweets = require('./twsf/twitter/tweets');
const storeNewTwsfDirectMessages = require('./twsf/twitter/direct-messages');

// Schedule twitter checks Sunday and Thursday at 12pm EST. The intention is to
// schedule this at the start of the show. Twitter allows us to search the last
// thirty days of tweets, so we don't need to check more than once a week. We
// should check just before the show begins. Glitch server is in UTC.
const twitterJob = schedule.scheduleJob('0 16 * * 0', () => {
    storeNewTwsfTweets();
    storeNewTwsfDirectMessages();
});

/*------*\
  SERVER
\*------*/
// Fastify
const fastify = require('fastify')({
    logger: {prettyPrint: true},
});

// Renderer
fastify.register(require('point-of-view'), {
    engine: {pug: require('pug')},
});

// Cookies
fastify.register(require('@fastify/cookie'), {
    secret: process.env.COOKIE_SECRET,
});

// Routes
fastify.register(require('@fastify/formbody'));
fastify.register(require('./src/routes/static'));
fastify.register(require('./src/routes/login'));
fastify.register(require('./src/routes/titles'));
fastify.register(require('./src/routes/twsf'));

// Start server
fastify.listen(3000, (err, address) => {
    console.log(`Listening on ${address}`);
    if (err) {
        console.error(err);
        process.exit(1);
    }
});
