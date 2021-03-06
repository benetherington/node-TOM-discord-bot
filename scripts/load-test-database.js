const public = require('../database/public');

const EPISODES = 5;
const AUTHORS = 20;
const SUGGESTIONS = 10;
const VOTES = 10;
const GUESSES = 5;

let db;
const fetchDb = async () => {
    db = await public;
};

/*--------*\
  EPISODES
\*--------*/
const createEpisodes = async () => {
    for (let epIdx = 0; epIdx < EPISODES; epIdx++) {
        const episodeId = EPISODES - epIdx;
        const epNum = 100 + EPISODES - epIdx - 1;
        const createdOffset = `-${epIdx} seconds`;
        await db.run(
            `INSERT INTO Episodes (episodeId, epNum, created_at)
                VALUES (?, ?, DATETIME('now', ?));`,
            episodeId,
            epNum,
            createdOffset,
        );
    }
};

/*-------*\
  AUTHORS
\*-------*/
const createAuthors = async () => {
    for (let authId = 1; authId <= AUTHORS; authId++) {
        await db.run(
            `INSERT INTO Authors
                (discordId, username, displayName)
            VALUES
                (?, ?, ?)`,
            888888 + authId,
            'user' + authId,
            `The Very ${authId}th`,
        );
    }
};

/*-----------------*\
  SUGGESTIONS&VOTES
\*-----------------*/
const TOTAL_SUGGESTIONS = EPISODES * SUGGESTIONS;
function randomId(max) {
    return Math.ceil(Math.random() * max);
}

const insertSuggestion = (epId, authId) => {
    return db.run(
        `INSERT INTO Suggestions
            (episodeId, authorId, text, token)
        VALUES
            (?, ?, ?, ?)`,
        epId,
        authId,
        'Delta ' + 'V'.repeat(epId) + 'I'.repeat(authId),
        777777 + epId * authId,
    );
};
const insertVote = (voterId, sugId) =>
    db.run(
        `INSERT OR IGNORE INTO Suggestion_Voters
            (voterId, suggestionId)
        VALUES (?, ?)`,
        voterId,
        sugId,
    );
const insertVotes = (epId, authId, sugId) => {
    // Insert the author's initial vote
    insertVote(authId, sugId);
    // Insert VOTES number of votes for this suggestion from random other authors
    for (voteIdx = 0; voteIdx < VOTES; voteIdx++) {
        let voterId;
        while (!voterId || voterId === authId) {
            voterId = randomId(AUTHORS);
        }
        insertVote(voterId, sugId);
    }
};
const createSuggestions = async () => {
    for (let epId = 1; epId <= EPISODES; epId++) {
        // iterate over episodes
        console.log(`... for Ep #${epId}...`);
        for (let authId = 1; authId <= AUTHORS; authId++) {
            // insert suggestions per episode
            const {lastID: sugId} = await insertSuggestion(epId, authId);
            await insertVotes(epId, authId, sugId);
        }
    }
};

/*-------*\
  GUESSES
\*-------*/
const types = {
    TWEET: 0,
    TWITTER_DM: 1,
    EMAIL: 2,
    DISCORD: 3,
};
const insertTweetGuess = (authId) => {
    const guessText = `Tweet, from author ${authId}.`;
    const tweetId = Math.floor(Math.random() * 1000);
    return db.run(
        `INSERT INTO Guesses (authorId, type, text, tweetId)
            VALUES (?, ?, ?, ?);`,
        authId,
        types.TWEET,
        guessText,
        tweetId,
    );
};
const insertTwitterDMGuess = (authId) => {
    const guessText = `Twitter DM, from author ${authId}.`;
    const tweetId = Math.floor(Math.random() * 1000);
    return db.run(
        `INSERT INTO Guesses (authorId, type, text, tweetId)
            VALUES (?, ?, ?, ?);`,
        authId,
        types.TWITTER_DM,
        guessText,
        tweetId,
    );
};
const insertEmailGuess = (authId) => {
    const guessText = `Email, from author ${authId}.`;
    return db.run(
        `INSERT INTO Guesses (authorId, type, text)
            VALUES (?, ?, ?);`,
        authId,
        types.EMAIL,
        guessText,
    );
};
const insertDiscordGuess = async (authId) => {
    const guessText = `Discord, from author ${authId}.`;
    const insertGuess = await db.run(
        `INSERT INTO Guesses (authorId, type, text)
            VALUES (?, ?, ?);`,
        authId,
        types.DISCORD,
        guessText,
    );

    const discordReplyId = Math.floor(Math.random() * 1000);
    await db.run(
        `UPDATE Guesses
            SET discordReplyId = ?
            WHERE guessId = ?;`,
        discordReplyId,
        insertGuess.lastID,
    );
};
const updateScore = (guessId, episodeId, correct, bonusPoint) =>
    db.run(
        `UPDATE Guesses
            SET episodeId = ?, correct = ?, bonusPoint = ?
            WHERE guessId = ?;`,
        episodeId,
        correct,
        bonusPoint,
        guessId,
    );
const createGuesses = async () => {
    // Insert a set of guess types for GUESSES number of sets, then do one more
    for (let idx = 0; idx < GUESSES + 1; idx++) {
        const authId = Math.round(Math.random() * AUTHORS);
        await insertTweetGuess(authId);
        await insertTwitterDMGuess(authId);
        await insertEmailGuess(authId);
        await insertDiscordGuess(authId);
    }

    // Assign assorted scores for GUESSES number of sets, leaving the extra set unscored
    const guessesPerEpisode = (EPISODES / GUESSES) * 4;
    for (let guessIdx = 0; guessIdx < (GUESSES - 1) * 4; guessIdx++) {
        const [correct, bonusPoint] = ['00', '10', '11'][guessIdx % 3];
        const guessId = guessIdx + 1;
        const episodeId = Math.floor(guessIdx / guessesPerEpisode) + 1;
        await updateScore(guessId, episodeId, correct, bonusPoint);
    }
};

const load = async () => {
    console.log('Getting database...');
    await fetchDb();

    console.log('Creating Episodes...');
    await createEpisodes();

    console.log('Creating Authors...');
    await createAuthors();

    console.log('Creating Suggestions...');
    await createSuggestions();

    console.log('Creating Guesses...');
    await createGuesses();

    console.log('Done!');
};

load();
