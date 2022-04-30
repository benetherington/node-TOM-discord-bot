try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}
const {Client, auth} = require('twitter-api-sdk');
const {addNewTwsfGuess} = require('../../src/sqlite/twsf');

const TOMUserId = '2827032970';
const client = new Client(process.env.TWITTER_BEARER_TOKEN);

const findSelfReplies = async (tweetId, authorId) => {
    // Fetch all tweets replying to this one
    const {data: conversation = []} = await client.tweets.tweetsRecentSearch({
        query: `conversation_id:${tweetId}`,
        expansions: ['author_id'],
    });

    // Grab the text of each tweet by the same author
    return conversation
        .filter((tweet) => tweet.author_id === authorId)
        .map((tweet) => tweet.text)
        .join(' ');
};

const fetchTwsfTweets = async () => {
    // Search for recent tweets
    const {data, includes} = await client.tweets.tweetsRecentSearch({
        query: '#thisweeksf',
        // Additional data we want to fetch
        'user.fields': ['name', 'username'],
        'tweet.fields': ['in_reply_to_user_id', 'conversation_id'],
        'media.fields': ['url'],
        // Required expansions for tweet.fields and media.fields
        expansions: ['author_id', 'attachments.media_keys'],
    });

    return {data, includes};
};

const formatTweets = async ({data, includes}) => {
    const tweetPromises = data.map(async (tweet) => {
        // Destructure tweet
        const {id: tweetId, text: origText, author_id: authorId} = tweet;

        // Gather author information from includes
        const {
            id: twitterId,
            name: twitterName,
            username: twitterUsername,
        } = includes.users.find((includedUser) => includedUser.id === authorId);

        // Find the rest of a multi-part guess
        const additionalText = await findSelfReplies(tweetId, authorId);
        const text = origText + additionalText;

        // Done!
        return {
            author: {twitterId, twitterName, twitterUsername},
            guess: {type: 'tweet', tweetId, text},
        };
    });
    const tweets = await Promise.all(tweetPromises);

    return tweets;
};

module.exports.storeNewTwsfTweets = async () => {
    console.log('Storing new #ThisWeekSF tweets...');

    // Get new tweets
    const {data, includes} = await fetchTwsfTweets();
    console.log(`Found ${data.length} #ThisWeekSF tweets.`);

    // Fetch conversations, format for the database
    const twsfTweets = await formatTweets({data, includes});

    // Store new tweets
    const storeagePromises = twsfTweets.map((tweet) => addNewTwsfGuess(tweet));
    const storeageResults = await Promise.all(storeagePromises);
    const success = storeageResults.every((r) => r);

    if (success) console.log('Done storing new #ThisWeekSF tweets!');
    else {
        console.error('Something went wrong storing #ThisWeekSF tweets...');
        console.error({storeageResults});
    }
};
