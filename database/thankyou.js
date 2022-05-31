let db;

/*---------*\
  UTILITIES
\*---------*/
const printDbSummary = async () => {
    try {
        const chatThank = await db.get(
            `SELECT COUNT(*) AS count
            FROM Authors
            WHERE chatThank;`,
        );
        console.log(`Chat thank-yous: ${chatThank.count}`);
    } catch {}
};

/*-------*\
  DB INIT
\*-------*/
const initDB = async () => {
    const public = require('./public');
    db = await public;
};
initDB().then(printDbSummary);

module.exports.updateAuthorThank = (author, chatThank = true) => {
    db.run(
        `INSERT INTO Authors
            (discordId, username, displayName, chatThank)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (discordId)
        DO UPDATE SET
            username = excluded.username,
            displayName = excluded.displayName,
            chatThank = excluded.chatThank;`,
        author.discordId,
        author.username,
        author.displayName,
        chatThank,
    );
};

module.exports.getChatThanks = () =>
    db.all(
        `SELECT callsign
        FROM Authors
        WHERE chatThank;`,
    );

module.exports.clearChatThanks = () =>
    db.run(
        `UPDATE Authors
        SET chatThank = false
        WHERE chatThank;`,
    );
