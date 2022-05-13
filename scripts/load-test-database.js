const sqlite3 = require('sqlite3').verbose();
const dbWrapper = require('sqlite');
let db;

const EPISODES = 5;
const AUTHORS = 20;
const SUGGESTIONS = 10;
const TOTAL_SUGGESTIONS = EPISODES * SUGGESTIONS;
const VOTES = 10;

const dbFile = require('path').resolve('./.data/title-suggestions.db');
const migrationsPath = './database/migrations/title-suggestions';
const initDB = async () => {
    db = await dbWrapper.open({
        filename: dbFile,
        driver: sqlite3.cached.Database,
    });
    await db.migrate({migrationsPath});
};

const createEpisodes = async () => {
    for (let epId = 100; epId <= 100 + EPISODES; epId++) {
        await db.run('INSERT INTO Episodes (epNum) VALUES (?);', epId);
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
const insertVote = (epId, authId) => {
    let sugId = epId * AUTHORS + authId;
    sugId = wobble(sugId);
    return db.run(
        `INSERT OR IGNORE INTO Suggestion_Voters
            (authorId, suggestionId)
        VALUES
            (?, ?)`,
        authId,
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
            for (let sugIdx = 0; sugIdx <= 10; sugIdx++) {
                // insert votes per suggestion
                await insertVote(epId, authId);
            }
        }
    }
};

(async () => {
    console.log('Starting database...');
    await initDB();

    console.log('Creating Episodes...');
    await createEpisodes();

    console.log('Creating Authors...');
    await createAuthors();

    console.log('Creating Suggestions...');
    await createSuggestions();

    console.log('Done!');
})();
