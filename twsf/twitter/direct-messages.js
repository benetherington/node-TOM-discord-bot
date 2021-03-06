require('dotenv').config();

const Twitter = require('twitter');
const logger = require('../../logger');
const {addNewGuess, guessTypes} = require('../../database/twsf');
const ID = require('../../config/twitter-id.json');

const client = new Twitter({
    consumer_key: process.env.TWITTER_API_KEY,
    consumer_secret: process.env.TWITTER_API_KEY_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const isIncomingHashtag = (event) =>
    // Docs not clear there's another type, but just to be safe
    event.type === 'message_create' &&
    // Remove messages we've sent
    event.message_create.target.sender_id !== ID.user.tom &&
    // Include messages with the trigger hashtag
    event.message_create.message_data.entities.hashtags.some(
        (ht) => ht.text.toLowerCase() === 'thisweeksf',
    );
const guessAndAuthorFromDm = async (event) => {
    const tweetId = event.id;
    const twitterId = event.message_create.sender_id;
    const text = event.message_create.message_data.text;

    const authorData = await client.get('users/show.json', {
        user_id: twitterId,
    });

    const twitterDisplayName = authorData.name;
    const twitterUsername = authorData.screen_name;
    const callsign = twitterDisplayName;

    return {
        author: {twitterId, twitterDisplayName, twitterUsername, callsign},
        guess: {type: guessTypes.TWITTER_DM, tweetId, text},
    };
};
const fetchDMs = async () => {
    let doneFetching = false;
    let cursor = undefined;
    let messagesToReturn = [];

    while (!doneFetching) {
        // Fetch direct message events
        const response = await client.get('direct_messages/events/list.json', {
            cursor,
        });

        logger.info(`Found ${response.events.length} direct messsages...`);

        // Find the message we want
        const hashtagMessages = response.events.filter(isIncomingHashtag);
        logger.info(
            `... ${hashtagMessages.length} of them are #ThisWeekSF direct messsages.`,
        );
        messagesToReturn = messagesToReturn.concat(hashtagMessages);

        // Check for another page
        if (response.nextCursor) {
            // We'll do an additional loop
            cursor = response.nextCursor;
            logger.info('Next page...');
        } else doneFetching = true;
    }

    // Done!
    return messagesToReturn;
};

module.exports = async () => {
    logger.info('Storing #ThisWeekSF direct messages...');

    // Get new DMs
    const twsfDms = await fetchDMs();

    // Don't continue if there weren't any DMs
    if (!twsfDms.length) {
        logger.info('No #ThisWeekSF direct messages found.');
        return;
    }

    // Format for the DB
    const guessesAndAuthors = await Promise.all(
        twsfDms.map(guessAndAuthorFromDm),
    );

    // Store new DMs
    const newGuessesCount = await guessesAndAuthors.reduce(
        async (prevPromise, guessAndAuthor) => {
            const prevCount = await prevPromise;
            const changedRowCount = await addNewGuess(guessAndAuthor);
            return prevCount + changedRowCount;
        },
        0,
    );
    logger.info(
        `Done storing ${newGuessesCount} new #ThisWeekSF direct messages!`,
    );
};
