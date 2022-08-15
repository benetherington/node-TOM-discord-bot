require('dotenv').config();

const fetch = require('node-fetch');
const logger = require('../../logger');

const headers = {
    'User-Agent': 'node-TOM-discord-bot',
    Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
};

const fetchConversationId = async (tweetId) => {
    // Build URL and send request
    const url = new URL('https://api.twitter.com/2/tweets');
    url.searchParams.append('ids', tweetId);
    url.searchParams.append('tweet.fields', 'conversation_id,author_id');
    url.searchParams.append('expansions', 'author_id');
    const response = await fetch(url, {headers});
    if (!response.ok)
        throw `Fetching conversation_id returned ${response.statusText}.`;

    // Check returned data
    const jsn = await response.json();
    if (!jsn.data || !jsn.data.length)
        throw 'Fetching conversation_id returned no response';

    // Return conversation ID
    const originalTweet = jsn.data[0];
    const conversationId = originalTweet.conversation_id;
    const twitterUserId = originalTweet.author_id;
    return {originalTweet, conversationId, twitterUserId};
};

const fetchTweetChain = async (conversationId, twitterUserId) => {
    // Build URL and send request
    const url = new URL('https://api.twitter.com/2/tweets/search/recent');
    url.searchParams.append(
        'query',
        `conversation_id:${conversationId} from:${twitterUserId} to:${twitterUserId}`,
    );
    const response = await fetch(url, {headers});
    if (!response.ok)
        throw `Searching by conversation_id returned ${response.statusText}.`;

    // Check returned data
    const jsn = await response.json();
    if (!jsn.data || !jsn.data.length)
        throw 'Fetching conversation_id returned no response';

    // Return tweets in conversation
    return jsn.data;
};

const condenseTweetChain = (originalTweet, tweetChain) => {
    // Add original tweet to tweetChain if it was missing
    const coversationContainsOriginal = tweetChain.some(
        (tweet) => tweet.id === originalTweet.id,
    );
    if (!coversationContainsOriginal) tweetChain.push(originalTweet);

    // Sort by ascending ID (created_at can be instantaneous)
    tweetChain.sort((a, b) => (a.id > b.id ? 1 : -1));

    // Extract text
    const texts = tweetChain.map((t) => t.text);
    return texts.join(' ');
};

module.exports = async (tweetId) => {
    // TODO: escape fetch errors
    // TODO: escape no tweets returned from /tweets?ids=
    // TODO: escape no tweets returned from /tweets/search
    try {
        // Fetch conversation ID
        const {originalTweet, conversationId, twitterUserId} =
            await fetchConversationId(tweetId);

        // Fetch tweets in conversation from this user to this user
        const tweetChain = await fetchTweetChain(conversationId, twitterUserId);

        // Sort and join
        return condenseTweetChain(originalTweet, tweetChain);
    } catch (error) {
        logger.error({
            msg: 'Encountered an issue while fetching tweet chain.',
            tweetId,
            error,
        });
    }
};
