try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}

const TOMUserId = '2827032970';
const Twitter = require('twitter');

const client = new Twitter({
    consumer_key: process.env.TWITTER_API_KEY,
    consumer_secret: process.env.TWITTER_API_KEY_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const formatDirectMessage = async (event) => {
    const {
        id,
        message_create: {
            sender_id: authorId,
            message_data: {text},
        },
    } = event;

    const authorData = await client.get('users/show.json', {
        user_id: authorId,
    });

    const {name: twitterName, screen_name: twitterUsername} = authorData;

    return {
        author: {twitterId: authorId, twitterName, twitterUsername},
        dm: {id, text},
    };
};

const fetchTwsfDirectMessages = async (cursor = undefined) => {
    console.log('Fetching #ThisWeekSF direct messages...');

    // Fetch direct message events
    const {events} = await client.get('direct_messages/events/list.json', {
        cursor,
    });
    console.log(`Found ${events.length} direct messsages.`);

    // Filter messages. I'm not sure another type is ever provided, but can't
    // hurt to be safe.
    const directMessages = events.filter(
        (event) => event.type === 'message_create',
    );

    // Get rid of messages we've sent
    const incomingMessages = directMessages.filter(
        (dm) => dm.message_create.target.sender_id !== TOMUserId,
    );

    // Find messages with the trigger hashtag
    let hashtagMessages = incomingMessages.filter((dm) =>
        dm.message_create.message_data.entities.hashtags.some(
            (ht) => ht.text.toLowerCase() === 'thisweeksf',
        ),
    );
    console.log(
        `${hashtagMessages.length} of them are #ThisWeekSF direct messsages.`,
    );

    // Extract the data we want
    const formattedPromises = hashtagMessages.map(formatDirectMessage);
    const formattedMessages = await Promise.all(formattedPromises);

    // Check for another page
    if (events.nextCursor) {
        // Recurse, passing along the cursor
        const nextPage = await fetchTwsfDirectMessages(events.nextCursor);
        // Add recursion result to this page's messages
        hashtagMessages = Array.concat(hashtagMessages, nextPage || []);
    }
    console.log('Done processing #ThisWeekSF direct messsages!');

    // Done!
    return formattedMessages;
};

module.exports.fetchTwsfDirectMessages = fetchTwsfDirectMessages;
