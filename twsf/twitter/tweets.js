require('dotenv').config();

const fetch = require('node-fetch');
const logger = require('../../logger');
const {addNewGuess, guessTypes} = require('../../database/twsf');
const fetchTweetChainText = require('./tweet-chain');

const headers = {Authorization: 'Bearer ' + process.env.TWITTER_BEARER_TOKEN};

const getSearchPage = async (params) => {
    // Build and send request
    const url = new URL(
        'https://api.twitter.com/1.1/tweets/search/30day/prod.json',
    );
    const method = 'POST';
    const body = JSON.stringify(params);
    const response = await fetch(url, {method, headers, body});
    if (!response.ok) throw response.statusText;

    // Check returned data
    const thisPage = await response.json();
    if (thisPage.error) throw error.message;

    // Return the raw JSON response
    return thisPage;
};
const getTwsfTweets = async () => {
    // Fetch first page
    const params = {query: '#thisweeksf'};
    let thisPage = await getSearchPage(params);
    const searchResults = thisPage.results;

    // Fetch additional pages
    while (thisPage.next) {
        params.next = thisPage.next;
        thisPage = await getSearchPage(params);
        searchResults.push(...thisPage.results);
    }

    // Return all fetched tweets
    return searchResults;
};

const getFullText = async (status) => {
    // Use API 2.0 to check whether the user replied to themselves
    const chainText = await fetchTweetChainText(status.id_str);
    if (chainText) return chainText;

    // Fall back to just this tweet's full text
    return status.truncated ? status.extended_tweet.full_text : status.text;
};

const guessAndAuthorFromTweet = async (status) => {
    const tweetId = status.id_str;
    const twitterId = status.user.id_str;
    const twitterDisplayName = status.user.name;
    const twitterUsername = status.user.screen_name;
    const callsign = twitterDisplayName;
    const text = await getFullText(status);

    // Construct author for DB
    const author = {
        twitterId,
        twitterDisplayName,
        twitterUsername,
        callsign,
    };

    // Construct guess for DB
    const guess = {
        type: guessTypes.TWEET,
        tweetId,
        text,
    };

    return {guess, author};
};

module.exports = async () => {
    logger.info('Storing #ThisWeekSF tweets...');

    // Get new tweets
    const twsfTweets = await getTwsfTweets();

    // Don't continue if there weren't any tweets
    if (!twsfTweets.length) {
        logger.info('No #ThisWeekSF tweets found.');
        return;
    }

    // Format for the DB
    const guessesAndAuthors = await Promise.all(
        twsfTweets.map(guessAndAuthorFromTweet),
    );

    // Store new tweets
    const dbPromises = guessesAndAuthors.map((guessAndAuthor) =>
        addNewGuess(guessAndAuthor),
    );
    const changeCounts = await Promise.all(dbPromises);
    const newGuessesCount = changeCounts.reduce((a, b) => a + b);

    logger.info(`Done storing ${newGuessesCount} new #ThisWeekSF tweets!`);
};
