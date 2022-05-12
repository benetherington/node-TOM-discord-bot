try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}
const fetch = require('node-fetch');
const {addNewTwsfGuess} = require('../src/sqlite/twsf');

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
        let response = await fetch(
            this._base + 'tweets/search/30day/prod.json',
            {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(query),
            },
        );
        const jsn = await response.json();
        jsn.pages = () => this._pages(jsn, query);
        return jsn;
    },
    _pages: async function (response, query) {
        let searchResults = response.results;
        while (response.next) {
            query.next = response.next;
            response = await this.search(query);
            searchResults = searchResults.concat(response.results);
        }
        return searchResults;
    },
};

/*------*\
  TWEETS
\*------*/
const fetchSelfReplyTexts = async (status) => {
    const twitterUsername = status.user.screen_name;
    const tweetId = status.id_str;

    // Fetch all self replies for this user
    const response = await client.search({
        query: `from:${twitterUsername} to:${twitterUsername}`,
    });
    const selfReplies = await response.pages();

    // Assemble a chain of replies
    const replyTexts = [status.extended_tweet.full_text];
    let stillSearching = selfReplies.length; // Don't start if no replies!
    while (stillSearching) {
        // Find a tweet replying to the starting tweet
        const reply = selfReplies.find((s) => s.in_reply_to_status_id === tweetId);
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
    const textReplies = await fetchSelfReplyTexts(status);
    const text = [textInitial, ...textReplies].join(' ');
    const guess = {
        type: 'tweet',
        tweetId,
        text,
    };

    return {guess, author};
};
const fetchTwsfTweets = () =>
    client.search({query: '#thisweeksf'}).then((r) => r.pages());

/*---------------*\
  DIRECT MESSAGES
\*---------------*/
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

/*-------*\
  EXPORTS
\*-------*/
module.exports.storeNewTwsfTweets = async () => {
    console.log('Storing #ThisWeekSF tweets...');

    // Get new tweets
    const twsfTweets = await fetchTwsfTweets();

    // Don't continue if there weren't any tweets
    if (!twsfTweets.length) {
        console.log('No #ThisWeekSF tweets found.');
        return;
    }

    // Format for the DB
    const guessesAndAuthors = await Promise.all(
        twsfTweets.map(guessAndAuthorFromTweet),
    );
    console.log(guessesAndAuthors);

    // Store new tweets
    const storageResults = await Promise.allSettled(
        guessesAndAuthors.map(addNewTwsfGuess),
    );
    const errors = storageResults.filter((p) => p.status === 'rejected');

    if (errors.length) {
        console.error('There was an issue storing #ThisWeekSF tweets.');
        console.error({errors});
    } else {
        console.log('Done storing new #ThisWeekSF tweets!');
    }
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
