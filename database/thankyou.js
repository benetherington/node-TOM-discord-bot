const logger = require('../logger');
let db;

/*---------*\
  UTILITIES
\*---------*/
const printThankYouSummary = async () => {
    try {
        const chatThank = await db.get(
            `SELECT COUNT(*) AS count
            FROM Authors
            WHERE chatThank;`,
        );
        logger.info(`There are ${chatThank.count} chat thank-yous.`);
    } catch (error) {
        logger.error({
            msg: 'There was an issue printing the chat thank you db summary.',
            error,
        });
    }
};

/*-------*\
  DB INIT
\*-------*/
const initDB = async () => {
    const public = require('./public');
    db = await public;
};
initDB().then(printThankYouSummary);

module.exports.updateAuthorThank = (author, chatThank = true) => {
    db.run(
        `INSERT INTO Authors (
            discordId,
            username,
            displayName,
            callsign,
            chatThank
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (discordId)
        DO UPDATE SET
            username = excluded.username,
            displayName = excluded.displayName,
            callsign = excluded.callsign,
            chatThank = excluded.chatThank;`,
        author.discordId,
        author.username,
        author.displayName,
        author.callsign,
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
