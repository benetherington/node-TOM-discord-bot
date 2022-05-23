try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}
const Twitter = require('twitter');
const {addNewTwsfGuess} = require('../../database/twsf');

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
const authorAndGuessFromDm = async (event) => {
    const tweetId = event.id,
        twitterId = event.message_create.sender_id,
        text = event.message_create.message_data.text;

    const authorData = await client.get('users/show.json', {
        user_id: twitterId,
    });

    const twitterDisplayName = authorData.name,
        twitterUsername = authorData.screen_name;

    return {
        author: {twitterId, twitterDisplayName, twitterUsername},
        guess: {type: 'twitter dm', tweetId, text},
    };
};
const fetchDMs = async () => {
    let doneFetching = false;
    let cursor = undefined;
    let guessesAndAuthors = [];

    while (!doneFetching) {
        // Fetch direct message events
        const response = await client.get('direct_messages/events/list.json', {
            cursor,
        });

        // Check for another page
        if (response.nextCursor) {
            // We'll do an additional loop
            cursor = response.nextCursor;
            console.log(
                `Found ${response.events.length} direct messsages and another page.`,
            );
        } else {
            doneFetching = true;
            console.log(
                `Found ${response.events.length} direct messsages and no more pages.`,
            );
        }

        // Find the message we want
        const hashtagMessages = response.events.filter(isIncomingHashtag);
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

module.exports = async () => {
    console.log('Storing #ThisWeekSF direct messages...');

    // Get new DMs
    const twsfDms = await fetchDMs();

    // Don't continue if there weren't any DMs
    if (!twsfDms.length) {
        console.log('No #ThisWeekSF direct messages found.');
        return;
    }

    // Store new DMs
    const storageResults = await Promise.allSettled(
        twsfDms.map(addNewTwsfGuess),
    );
    const errors = storageResults.filter((p) => p.status === 'rejected');

    if (errors.length) {
        console.error('There was an issue storing #ThisWeekSF DMs.');
        console.error({errors});
    } else {
        console.log('Done storing new #ThisWeekSF DMs!');
    }
};
