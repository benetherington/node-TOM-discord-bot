try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}
const fetch = require('node-fetch');
const {addNewGuess, guessTypes} = require('../../database/twsf');

const client = {
    _base: 'https://api.twitter.com/1.1/',
    headers: {Authorization: 'Bearer ' + process.env.TWITTER_BEARER_TOKEN},
    get: function (tweetId) {
        return fetch(
            this._base +
                'statuses/show.json?tweet_mode=extended&id=' +
                tweetId.toString(),
            {
                headers: this.headers,
            },
        ).then((r) => r.json());
    },
    search: async function (query) {
        const response = await fetch(
            this._base + 'tweets/search/30day/prod.json',
            {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(query),
            },
        );
        const jsn = await response.json();
        jsn.all = () => this._next(jsn, query);
        return jsn;
    },
    _next: async function (response, query) {
        let searchResults = response.results;
        while (response.next) {
            query.next = response.next;
            response = await this.search(query);
            searchResults = searchResults.concat(response.results);
        }
        return searchResults;
    },
};

const fetchSelfReplies = async (status) => {
    const twitterUsername = status.user.screen_name;
    const tweetId = status.id_str;

    // Fetch all self replies for this user
    const response = await client.search({
        query: `from:${twitterUsername} to:${twitterUsername}`,
    });
    const selfReplies = await response.all();

    // Assemble a chain of replies
    const replyTexts = [status.extended_tweet.full_text];
    let stillSearching = selfReplies.length; // Don't start if no replies!
    while (stillSearching) {
        // Find a tweet replying to the starting tweet
        const reply = selfReplies.find(
            (s) => s.in_reply_to_status_id === tweetId,
        );
        if (reply) {
            // Prepend the text, and look for a reply to the reply
            replyTexts.unshift(reply.extended_tweet.full_text);
            tweetId = reply.id;
        } else {
            stillSearching = false;
        }
    }

    // Done! Return an array.
    return replyTexts;
};
const guessAndAuthorFromTweet = async (status) => {
    const tweetId = status.id_str,
        textInitial = status.extended_tweet
            ? status.extended_tweet.full_text
            : status.full_text,
        twitterId = status.user.id_str,
        twitterDisplayName = status.user.name,
        twitterUsername = status.user.screen_name;

    // Construct author for DB
    const author = {
        twitterId,
        twitterDisplayName,
        twitterUsername,
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
const fetchTweets = () =>
    client.search({query: '#thisweeksf'}).then((r) => r.all());

module.exports = async () => {
    console.log('Storing #ThisWeekSF tweets...');

    // Get new tweets
    const twsfTweets = await fetchTweets();

    // Don't continue if there weren't any tweets
    if (!twsfTweets.length) {
        console.log('No #ThisWeekSF tweets found.');
        return;
    }

    // Format for the DB
    const guessesAndAuthors = await Promise.all(
        twsfTweets.map(guessAndAuthorFromTweet),
    );

    // Store new tweets
    const storageResults = await Promise.all(
        guessesAndAuthors.map(addNewGuess),
    );
    const newGuessesCount = storageResults.reduce((prev, curr) => prev + curr);
    console.log(`Done storing ${newGuessesCount} new #ThisWeekSF tweets!`);
};
