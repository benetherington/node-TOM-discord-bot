const {client} = require('../../bot');
const public = require('../../database/public');
let db;

const ID = require('../../config/discord-id.json');

/*
This isn't strictly neccessary, but due to incorrect column affinity on
Authors.discordId, some of our IDs are malformed, with a few LSDs rounded off.
By importing everyone on the server, we can assure everyone's pretty well
accounted for.
*/

const updateAuthorById = (author) =>
    db.run(
        `UPDATE Authors
        SET
            discordId = ?,
            username = ?,
            displayName = ?,
            callsign = ?
        WHERE authorId = ?;`,
        author.discordId,
        author.username,
        author.displayName,
        author.callsign,
        author.authorId,
    );
const upsertAuthor = (author) =>
    db.run(
        `INSERT INTO Authors (
            discordId,
            username,
            displayName,
            callsign
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT (discordId)
        DO UPDATE SET
            username = excluded.username,
            displayName = excluded.displayName,
            callsign = excluded.callsign;`,
        author.discordId,
        author.username,
        author.displayName,
        author.callsign,
    );

const getLikeAuthors = (author) =>
    db.all(
        `SELECT *
        FROM Authors
        WHERE
            discordId = ?
            OR username = ?;`,
        author.discordId,
        author.username,
    );
const buildAuthor = (id, member) => {
    const discordId = id.toString();
    const username = member.user.username;
    const displayName = member.displayName || '';
    const callsign = member.nickname || displayName || username;
    return {
        discordId,
        username,
        displayName,
        callsign,
    };
};

client.once('ready', async () => {
    db = await public;

    // fetch data from Discord
    const anonGuild = await client.guilds.fetch(ID.guild.tomCast);
    const guild = await anonGuild.fetch();
    const members = await guild.members.fetch();

    for (const [id, member] of members) {
        const author = buildAuthor(id, member);

        if (author.username === 'stygarfield') continue;
        // Find matching Authors on username. DiscordId is malformed because
        // rounding errors.
        const remainingLikeAuthors = await getLikeAuthors(author);
        const firstLikeAuthor = remainingLikeAuthors.pop();

        // If we found more than one author that matches username or discordId,
        // let a human make a decision.
        if (remainingLikeAuthors.length) console.error(author);

        if (firstLikeAuthor) {
            author.discordId = firstLikeAuthor.discordId;
            await updateAuthorById(author);
        } else {
            await upsertAuthor(author);
        }
    }
    console.log('done!');
});
