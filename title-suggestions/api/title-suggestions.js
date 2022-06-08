const {client} = require('../../bot');
const {
    addNewSuggestion,
    deleteSuggestion,
} = require('../../database/suggestions');
const ID = require('../../config/discord-id.json');

const fetchMessage = async (messageId) => {
    // Fetch message from #ground_control
    try {
        const channel = await client.channels.fetch(ID.channel.groundControl);
        return await channel.messages.fetch(messageId);
    } catch {}

    // Try again in #bot_control
    try {
        const channel = await client.channels.fetch(ID.channel.botTest);
        return await channel.messages.fetch(messageId);
    } catch {
        throw 'Could not add unknown message as a title suggestion.';
    }
};
const fetchMemberFromDiscordUser = async (author) => {
    const guild = await client.guilds.fetch(ID.guild.tomCast);
    return guild.members.fetch(author.id);
};
const createAuthorFromMessage = async (message) => {
    // User properties will always be available
    const discordId = message.author.id;
    const username = message.author.username;

    // Member properties will never be available when we start from a messageId,
    // so we'll have to fetch them from the guild
    const member = await fetchMemberFromDiscordUser(message.author);
    const displayName = member.displayName || '';

    const callsign = member.nickname || displayName || username;
    return {discordId, username, displayName, callsign};
};
const createSuggestionFromMessage = (message) => {
    const text = message.content;
    const messageId = message.id;
    return {text, messageId};
};

module.exports.addNewSuggestionFromApi = async (messageId) => {
    client.logger.info(`API creating suggestion from message ${messageId}`);

    const message = await fetchMessage(messageId);
    const author = await createAuthorFromMessage(message);
    const suggestion = createSuggestionFromMessage(message);
    addNewSuggestion(author, suggestion);
};
module.exports.removeSuggestionFromApi = async (suggestionId) => {
    client.logger.info(`API deleting suggestion ${suggestionId}`);
    deleteSuggestion({suggestionId});
};
