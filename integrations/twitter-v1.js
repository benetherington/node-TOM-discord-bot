try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}
const Twitter = require('twitter');
const {addNewTwsfGuess} = require('../src/sqlite/twsf');

const TOMUserId = '2827032970';
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
    event.message_create.target.sender_id !== TOMUserId &&
    // Include messages with the trigger hashtag
    event.message_create.message_data.entities.hashtags.some(
        (ht) => ht.text.toLowerCase() === 'thisweeksf',
    );
const authorAndGuessFromDm = async (event) => {
    const {
        id: twitterDmId,
        message_create: {
            sender_id: twitterId,
            message_data: {text},
        },
    } = event;

    const authorData = await client.get('users/show.json', {
        user_id: twitterId,
    });

    const {name: twitterName, screen_name: twitterUsername} = authorData;

    return {
        author: {twitterId, twitterName, twitterUsername},
        guess: {type: 'twitter dm', twitterDmId, text},
    };
};

const fetchTwsfDirectMessages = async () => {
    let doneFetching = false;
    let cursor = undefined;
    let guessesAndAuthors = [];

    while (!doneFetching) {
        // Fetch direct message events
        const {events} = await client.get('direct_messages/events/list.json', {
            cursor,
        });

        // Check for another page
        if (events.nextCursor) {
            // We'll do an additional loop
            cursor = events.nextCursor;
            console.log(
                `Found ${events.length} direct messsages and another page.`,
            );
        } else {
            doneFetching = true;
            console.log(
                `Found ${events.length} direct messsages and no more pages.`,
            );
        }

        // Find the message we want
        const hashtagMessages = events.filter(isIncomingHashtag);
        console.log(
            `${hashtagMessages.length} of them are #ThisWeekSF direct messsages.`,
        );

        // Format data to send to the DB
        const thisPageGuessesAuthors = await Promise.all(
            hashtagMessages.map(authorAndGuessFromDm),
        );
        guessesAndAuthors.push(thisPageGuessesAuthors);
    }

    // Done!
    console.log('Done processing #ThisWeekSF direct messsages!');
    return guessesAndAuthors;
};

module.exports.storeNewTwsfDirectMessages = async () => {
    console.log('Storing #ThisWeekSF direct messages...');

    // Get new DMs
    const twsfDms = await fetchTwsfDirectMessages();

    // Don't continue if there weren't any DMs
    if (!twsfDms.length) {
        console.log('No #ThisWeekSF direct messages found.');
        return;
    }

    // Store new DMs
    const storageResults = await Promise.all(twsfDms.map(addNewTwsfGuess));
    const success = storageResults.every((r) => r);

    // Done! Report final results.
    if (success) console.log('Done storing new #ThisWeekSF direct messages!');
    else {
        console.error(
            'Something went wrong storing #ThisWeekSF direct messages...',
        );
        console.error({storageResults});
    }
};
