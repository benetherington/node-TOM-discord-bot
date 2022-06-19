/*------*\
  SERVER
\*------*/
// Fastify
const logger = require('./logger');
const fastify = require('fastify')({logger});

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
fastify.register(require("./src/routes/email"));
fastify.register(require('./src/routes/login'));
fastify.register(require('./src/routes/manage'));
fastify.register(require('./src/routes/static'));
fastify.register(require('./src/routes/titles'));
fastify.register(require('./src/routes/twsf'));

// Start server
fastify.listen(3000, (err, address) => {
    logger.info(`Listening on ${address}`);
    if (err) {
        logger.error(err);
        twitterJob.gracefulShutdown();
        process.exit(1);
    }
});

/*---*\
  BOT
\*---*/
require('./bot');

/*----------------*\
  SCHEDULED EVENTS
\*----------------*/
const schedule = require('node-schedule');

// Twitter
const storeNewTwsfTweets = require('./twsf/twitter/tweets');
const storeNewTwsfDirectMessages = require('./twsf/twitter/direct-messages');

// Schedule twitter checks Sunday at 12pm EST. The intention is to schedule this
// at the start of the show. Twitter allows us to search the last thirty days of
// tweets, so we don't need to check more than once a week, but we want guesses
// available before the crew begins finalizing the show notes Sunday morning,
// then we should check again just before the show begins. Glitch server is in
// UTC.
const twitterJob = schedule.scheduleJob('0 13,16 * * 0', () => {
    storeNewTwsfTweets();
    storeNewTwsfDirectMessages();
});

// Increment episode
// const {incrementEpisode} = require("./database/suggestions");
// const incrementEpisodeJob = schedule.scheduleJob('', ()=>{
//   incrementEpisode();
// })
