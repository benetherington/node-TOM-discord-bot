require('dotenv').config();

const fetch = require('node-fetch');
const logger = require('../../logger');

const headers = {
    'User-Agent': 'node-TOM-discord-bot',
    Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
};

const fetchConversationId = async (tweetId) => {
    const url = new URL('https://api.twitter.com/2/tweets');
    url.searchParams.append('ids', tweetId);
    url.searchParams.append('tweet.fields', 'conversation_id');
    const response = await fetch(url, {headers});
    const jsn = await response.json();
    const originalTweet = jsn.data[0];
    const conversationId = originalTweet.conversation_id;
    return originalTweet, conversationId;
};

const fetchTweetsInConversation = async (conversationId) => {
    const url = new URL('https://api.twitter.com/2/tweets/search/recent');
    url.searchParams.append('query', `conversation_id:${conversationId}`);
    url.searchParams.append('tweet.fields', 'author_id,created_at');
    const response = await fetch(url, {headers});
    const jsn = await response.json();
    return jsn.data;
};

const condenseConversation = (originalTweet, conversation) => {
    // Add original tweet to conversation if it was missing
    const coversationContainsOriginal = conversation.find(
        (tweet) => tweet.id === originalTweet.id,
    );
    if (!coversationContainsOriginal) conversation.push(originalTweet);

    // Sort by ascending ID (created_at can be instantaneous)
    conversation.sort((a, b) => (a.id > b.id ? 1 : -1));

    // Extract text
    const texts = conversation.map((t) => t.text);
    return texts.join(' ');
};

module.exports = async (tweetId) => {
    // TODO: escape fetch errors
    // TODO: escape no tweets returned from /tweets?ids=
    // TODO: escape no tweets returned from /tweets/search
    const {originalTweet, conversationId} = await fetchConversationId(tweetId);
    const conversation = await fetchTweetsInConversation(conversationId);
    return condenseConversation(originalTweet, conversation);
};
