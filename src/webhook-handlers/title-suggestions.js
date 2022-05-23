const {client} = require('../../bot');
const {
    addNewSuggestion,
    deleteSuggestion,
} = require('../../database/suggestions');
const ID = require('../../config/discord-id.json');

const fetchMessage = async (messageId) => {
    // Fetch message from #ground_control
    let channel = await client.channels.fetch(ID.channel.groundControl);
    try {
        return await channel.messages.fetch(messageId);
    } catch {}

    // Try again in #bot_control
    channel = await client.channels.fetch(ID.channel.botTest);
    try {
        return await channel.messages.fetch(messageId);
    } catch {
        console.log('Could not add unknown message as a title suggestion.');
    }
};
const fetchMemberFromDiscordAuthor = (author) => {
    const tomCastGuild = client.guilds.cache.get(ID.guild.tomCast);
    return tomCastGuild.members.fetch(author.id);
};

const createAuthorFromMessage = async (message) => {
    const discordId = message.author.id;
    const username = message.author.username;
    const member = await fetchMemberFromDiscordAuthor(message.author);
    const displayName = member.nickname || '';
    return {discordId, username, displayName};
};
const createSuggestionFromMessage = (message) => {
    const text = message.content;
    const token = message.token;
    const messageId = message.id;
    return {text, token, messageId};
};

module.exports.addNewSuggestionFromApi = async (messageId) => {
    console.log(`API creating ${messageId}`);

    const message = await fetchMessage(messageId);
    const author = await createAuthorFromMessage(message);
    const suggestion = createSuggestionFromMessage(message);
    addNewSuggestion(author, suggestion);
};
module.exports.removeSuggestionFromApi = async (messageId) => {
    console.log(`API deleting ${messageId}`);

    const suggestion = {suggestionId: messageId};
    deleteSuggestion(suggestion);
};
