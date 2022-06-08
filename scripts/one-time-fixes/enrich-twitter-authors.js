require('dotenv').config();
const fetch = require('node-fetch');
const public = require('../../database/public');
let db;

const base = 'https://api.twitter.com/1.1/';
const headers = {Authorization: 'Bearer ' + process.env.TWITTER_BEARER_TOKEN};
const getUsersById = (userIds) => {
    const url = new URL(base + 'users/lookup.json');
    url.searchParams.append('user_id', userIds.join());
    return fetch(url, {headers}).then((r) => r.json());
};
const getUsersByScreenName = (screenNames) => {
    const url = new URL(base + 'users/lookup.json');
    url.searchParams.append('screen_name', screenNames.join());
    return fetch(url, {headers}).then((r) => r.json());
};

const createAuthor = (user) => {
    const twitterId = user.id_str;
    const twitterDisplayName = user.name;
    const twitterUsername = user.screen_name;
    const callsign = twitterDisplayName;

    // Construct author for DB
    return {
        twitterId,
        twitterDisplayName,
        twitterUsername,
        callsign,
    };
};
const enrichAuthor = ([author, user]) => {
    if (!user) return;
    const newAuthor = createAuthor(user);
    if (newAuthor.twitterId === '891058134524936193') {
        newAuthor.callsign = 'Peter McMally';
    }
    db.run(
        `UPDATE Authors
        SET
            twitterId = ?,
            twitterDisplayName = ?,
            twitterUsername = ?,
            callsign = ?
        WHERE authorId = ?;`,
        newAuthor.twitterId,
        newAuthor.twitterDisplayName,
        newAuthor.twitterUsername,
        newAuthor.callsign,
        author.authorId,
    );
};

const enrichAuthors = async () => {
    db = await public;

    // Fetch existing authors
    const authors = await db.all(
        `SELECT * FROM Authors
        WHERE twitterId;`,
    );

    // Fetch new user data from Twitter
    const twitterIds = authors.map((a) => a.twitterId);
    let twitterUsers = await getUsersById(twitterIds);

    // Make sure all our IDs were correct
    const authorsMissingUsers = authors.filter(
        (author) => !twitterUsers.find((u) => u.id_str === author.twitterId),
    );

    // Re-fetch new user data using usernames where required
    const missingUserNames = authorsMissingUsers.map((a) => a.twitterUsername);
    const foundUsers = await getUsersByScreenName(missingUserNames);
    twitterUsers = twitterUsers.concat(foundUsers);

    // Pair Authors and Twitter users
    const authorsAndUsers = authors.map((author) => [
        author,
        twitterUsers.find((u) => u.id_str === author.twitterId),
    ]);

    // Update the DB
    authorsAndUsers.map(enrichAuthor);
};
enrichAuthors();
