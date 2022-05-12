const path = require('path');

/*---*\
  BOT
\*---*/
require('../bot.js');

/*-------*\
  TWITTER
\*-------*/
const schedule = require('node-schedule');
const storeNewTwsfTweets = require('../integrations/twitter-v2');
const storeNewTwsfDirectMessages = require('../integrations/twitter-v1');

// Schedule twitter checks Sunday and Thursday at 12pm EST.
// The intention is to schedule this at the start of the show. Twitter allows us
// to search the last seven days of tweets, so we should check at least once a
// week, twice to be safe. Glitch server is in UTC.
const twitterJob = schedule.scheduleJob('* * 16 * 0,4', () => {
    storeNewTwsfTweets();
    storeNewTwsfDirectMessages();
});

/*------*\
  SERVER
\*------*/
// Fastify
const fastify = require('fastify')({
    logger: {level: 'debug'},
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
fastify.register(require('./routes/static.js'));
fastify.register(require('./routes/login.js'));
fastify.register(require('./routes/monitor.js'));

// Start server
fastify.listen(3000, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
});
