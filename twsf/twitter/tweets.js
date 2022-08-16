require('dotenv').config();

const fetch = require('node-fetch');
const logger = require('../../logger');
const {addNewGuess, guessTypes} = require('../../database/twsf');
const fetchTweetChain = require('tweet-chain');

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

    // Assemble a chain of replies
    const replyTexts = [getFullText(status)];
    let stillSearching = selfReplies.length; // Don't start if no replies!
    while (stillSearching) {
        // Find a tweet replying to the starting tweet
        const reply = selfReplies.find(
            (s) => s.in_reply_to_status_id === tweetId,
        );
        if (reply) {
            // Prepend the text, and look for a reply to the reply
            replyTexts.unshift(getFullText(reply));
            tweetId = reply.id;
        } else {
            stillSearching = false;
        }
    }

    // Done! Return an array.
    return replyTexts;
};
const guessAndAuthorFromTweet = async (status) => {
    const tweetId = status.id_str;
    const textInitial = status.extended_tweet
        ? status.extended_tweet.full_text
        : status.full_text;
    const twitterId = status.user.id_str;
    const twitterDisplayName = status.user.name;
    const twitterUsername = status.user.screen_name;
    const callsign = twitterDisplayName;

    // Construct author for DB
    const author = {
        twitterId,
        twitterDisplayName,
        twitterUsername,
        callsign,
    };

    // Construct guess for DB
    // Start by checking for self-replies to this tweet
    const textReplies = await fetchSelfReplies(status);
    const text = [textInitial, ...textReplies].join(' ');
    const guess = {
        type: guessTypes.TWEET,
        tweetId,
        text,
    };

    return {guess, author};
};
const fetchTweets = async () => {
    const results = client.search({query: '#thisweeksf'});
    return await results.all();
};

module.exports = async () => {
    logger.info('Storing #ThisWeekSF tweets...');

    // Get new tweets
    const twsfTweets = await fetchTweets();

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
    const newGuessesCount = await guessesAndAuthors.reduce(
        async (prevPromise, guessAndAuthor) => {
            const prevCount = await prevPromise;
            const changedRowCount = await addNewGuess(guessAndAuthor);
            return prevCount + changedRowCount;
        },
        0,
    );
    logger.info(`Done storing ${newGuessesCount} new #ThisWeekSF tweets!`);
};
