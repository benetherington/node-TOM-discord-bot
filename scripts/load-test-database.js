const public = require('../database/public');

const EPISODES = 5;
const AUTHORS = 20;
const SUGGESTIONS = 10;
const TOTAL_SUGGESTIONS = EPISODES * SUGGESTIONS;
const VOTES = 10;
const GUESSES = 5;

let db;
const fetchDb = async () => {
    db = await public;
};

const createEpisodes = async () => {
    for (let epIdx = 0; epIdx <= EPISODES; epIdx++) {
        await db.run(
            `INSERT INTO Episodes (epNum, created_at)
                VALUES (?, DATETIME('now', ?));`,
            100 + EPISODES - epIdx,
            `-${epIdx + 1} seconds`,
        );
    }
};

const createAuthors = async () => {
    for (let authId = 0; authId <= AUTHORS; authId++) {
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

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
function bound(min, int, max) {
    return Math.min(max, Math.max(int, min));
}
const wobble = (int) => {
    const boundMin = 0;
    const boundMax = TOTAL_SUGGESTIONS;
    const wobbleMax = 5;
    const wobble = getRandomInt(wobbleMax * 2) - wobbleMax;
    return bound(boundMin, int + wobble, boundMax);
};

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
const insertVote = (epId, voterId) => {
    let sugId = epId * AUTHORS + voterId;
    sugId = wobble(sugId);
    return db.run(
        `INSERT OR IGNORE INTO Suggestion_Voters
            (voterId, suggestionId)
        VALUES
            (?, ?)`,
        voterId,
        sugId,
    );
};
const createSuggestions = async () => {
    for (let epId = 0; epId <= 5; epId++) {
        // iterate over episodes
        console.log(`... for Ep #${epId}...`);
        for (let authId = 0; authId <= 10; authId++) {
            // insert suggestions per episode
            await insertSuggestion(epId, authId);
            for (let sugIdx = 0; sugIdx <= VOTES; sugIdx++) {
                // insert votes per suggestion
                await insertVote(epId, authId);
            }
        }
    }
};

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
const updateScore = (guessId, correct, bonusPoint) => {
    return db.run(
        `UPDATE Guesses
            SET correct = ?, bonusPoint = ?
            WHERE guessId = ?;`,
        correct,
        bonusPoint,
        guessId,
    );
};
const createGuesses = async () => {
    for (let idx = 0; idx < GUESSES; idx++) {
        const authId = Math.round(Math.random() * AUTHORS);
        await insertTweetGuess(authId);
        await insertTwitterDMGuess(authId);
        await insertEmailGuess(authId);
        await insertDiscordGuess(authId);
    }

    for (let guessId = 1; guessId <= GUESSES*4; guessId++) {
        const [correct, bonusPoint] = ['00', '10', '11'][guessId % 3];

        await updateScore(guessId, correct, bonusPoint);
    }
};

(async () => {
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
})();
