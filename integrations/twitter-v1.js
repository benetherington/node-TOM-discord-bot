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
