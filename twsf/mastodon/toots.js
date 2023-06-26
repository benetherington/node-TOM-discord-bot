require('dotenv').config();

const fetch = require('node-fetch');
const logger = require('../../logger');
const {addNewGuess, guessTypes} = require('../../database/twsf');

/*
const fetchTwsfTootHistory = async (instance) => {
    const path = '/api/v2/search';
    const url = new URL(instance + path);

    url.searchParams.append('q', 'thisweeksf');
    url.searchParams.append('type', 'hashtag');

    const resp = await fetch(url);
    if (!resp.ok) {
        console.error(
            `Encountered ${resp.statusText} when fetching peers from ${instance}`,
        );
        return [];
    }

    const jsn = await resp.json();
    return jsn.hashtags.find((ht) => ht.name === 'thisweeksf').history;
};
*/

const tootIsRemote = (status) => {
    status.account.acct.includes('@');
};
const getTootInstanceName = (status) => {
    return status.url.match(/https?:\/\/(.*?)\//)[1];
};
const normalizeAcct = (status) => {
    if (tootIsRemote(status)) return status.account.acct;
    return status.account.username + '@' + getTootInstanceName(status);
};

const fetchSearchPage = async (url) => {
    const resp = await fetch(url);
    if (!resp.ok) {
        console.error(`Encountered ${resp.statusText} when fetching ${url}`);
        return {statuses: []};
    }

    const statuses = await resp.json();

    const links = resp.headers.get('Link');
    const next = links?.match(/rel="next", <(.*?)>/)?.[1];

    return {statuses, next};
};

const fetchTwsfToots = async (instance, sinceId) => {
    const path = '/api/v1/timelines/tag/thisweeksf';
    const url = new URL(instance + path);
    if (sinceId) url.searchParams.append('since_id', sinceId);

    const fetchedToots = [];
    let statuses;
    let next = url;

    while (next) {
        ({statuses, next} = await fetchSearchPage(next));
        fetchedToots.push(...statuses);
    }

    return fetchedToots;
};

const getTootReplies = async (status) => {
    const instance = 'http://' + getTootInstanceName(status);
    const path = `/api/v1/statuses/${status.id}/context`;
    const url = instance + path;

    const resp = await fetch(url);
    if (!resp.ok) {
        console.error(
            `Encountered ${resp.statusText} when fetching replies to ${status.id}`,
        );
        return [];
    }

    const jsn = await resp.json();
    const replies = jsn.descendants;

    const selfReplies = replies.filter(
        (reply) => reply.account.id === status.account.id,
    );
    const replyTexts = Promise.all(selfReplies.map(getFullText));

    return replyTexts;
};

const getFullText = async (status) => {
    let fullText = [status.content];

    // Check for reblogs
    if (status.reblog) {
        const reblogTexts = await getFullText(status.reblog);
        fullText.push(...reblogTexts);
    }

    // Check for replies
    if (status.replies_count > 0) {
        const repliesTexts = await getTootReplies(status);
        fullText.push(...repliesTexts);
    }

    return fullText.join(' | ');
};

const guessAndAuthorFromToot = async (status) => {
    // Construct author for DB
    const mastodonId = status.account.id;
    const mastodonDisplayName = status.account.display_name;
    const mastodonUsername = normalizeAcct(status);
    const callsign = mastodonDisplayName;
    const author = {
        mastodonId,
        mastodonDisplayName,
        mastodonUsername,
        callsign,
    };

    // Construct guess for DB
    const tootId = status.id;
    const text = await getFullText(status);
    const guess = {
        type: guessTypes.TOOT,
        tootId,
        text,
    };

    return {guess, author};
};

module.exports = async () => {
    logger.info('Storing #thisWeekSF toots...');

    // Get new toots
    const twsfToots = await fetchTwsfToots('http://spacey.space');

    // Don't continue if there weren't any toots
    if (!twsfToots.length) {
        logger.info('No #thisWeekSF toots found.');
        return;
    }

    // Format for the DB
    const guessesAndAuthors = await Promise.all(
        twsfToots.map(guessAndAuthorFromToot),
    );

    // Store new toots
    const dbPromises = guessesAndAuthors.map((guessAndAuthor) =>
        addNewGuess(guessAndAuthor),
    );
    const changeCounts = await Promise.all(dbPromises);
    const newGuessesCount = changeCounts.reduce((a, b) => a + b);

    logger.info(`Done storing ${newGuessesCount} new #thisWeekSF toots!`);
};

if (require.main === module) {
    module.exports();
}
