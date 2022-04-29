try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}
const {Client, auth} = require('twitter-api-sdk');

const TOMUserId = '2827032970';
const client = new Client(process.env.TWITTER_BEARER_TOKEN);

const findSelfReplies = async (id, authorId) => {
    // Fetch all tweets replying to this one
    const {data: conversation = []} = await client.tweets.tweetsRecentSearch({
        query: `conversation_id:${id}`,
        expansions: ['author_id'],
    });

    // Grab the text of each tweet by the same author
    return conversation
        .filter((tweet) => tweet.author_id === authorId)
        .map((tweet) => tweet.text)
        .join(' ');
};

module.exports.fetchTwsfTweets = async () => {
    console.log('Fetching #ThisWeekSF tweets...');

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
    console.log(`Found ${data.length} #ThisWeekSF tweets.`);

    // Extract and format data
    const tweetPromises = data.map(async (tweet) => {
        // Destructure tweet
        const {id, text: origText, author_id: authorId} = tweet;

        // Gather author information from includes
        const {
            id: twitterId,
            name: twitterName,
            username: twitterUsername,
        } = includes.users.find((includedUser) => includedUser.id === authorId);

        // Find the rest of a multi-part guess
        const additionalText = await findSelfReplies(id, authorId);
        const text = origText + additionalText;

        // Done!
        return {
            author: {twitterId, twitterName, twitterUsername},
            tweet: {id, text},
        };
    });
    const tweets = await Promise.all(tweetPromises);
    console.log("Done processing #ThisWeekSF tweets!")

    return tweets;
};
