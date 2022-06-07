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
const findBestMatch = (newAuthor, likeAuthors) => {
    const sameId = likeAuthors.find(
        (a) => a.discordId.toString() === newAuthor.discordId,
    );
    if (sameId) return sameId;

    const closeId = likeAuthors.find(
        (a) =>
            a.discordId.toString().slice(-4) === newAuthor.discordId.slice(-4),
    );
    if (closeId) return closeId;
};

client.once('ready', async () => {
    db = await public;

    // fetch data from Discord
    const anonGuild = await client.guilds.fetch(ID.guild.tomCast);
    const guild = await anonGuild.fetch();
    const members = await guild.members.fetch();

    for (const [id, member] of members) {
        const newAuthor = buildAuthor(id, member);

        // Find matching Authors on username. DiscordId is malformed because
        // rounding errors.
        let likeAuthors = await getLikeAuthors(newAuthor);

        // Non-ideal: pick which match to update
        if (likeAuthors.length > 1) {
            const bestMatch = findBestMatch(newAuthor, likeAuthors);
            if (!bestMatch) continue;
            newAuthor.authorId = bestMatch.authorId;
            updateAuthorById(newAuthor);
            continue;
        }

        // Ideal: update or insert a single match
        const likeAuthor = likeAuthors.pop();
        if (likeAuthor) {
            newAuthor.authorId = likeAuthor.authorId;
            updateAuthorById(newAuthor);
        } else {
            upsertAuthor(newAuthor);
        }
    }
    console.log('done!');
});
