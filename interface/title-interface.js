const {client} = require("../bot.js");
const {addNewSuggestion} = require("../src/sqlite.js");
const ID = require("../src/id.json");

const fetchMessage = async(messageId)=>{
    const groundControl = client.channels.cache.get(ID.channel.botTest);
    return await groundControl.messages.fetch(messageId)
}
const fetchMemberFromDiscordAuthor = (author)=>{
    const tomCastGuild = client.guilds.cache.get(ID.guild.tomCast);
    return tomCastGuild.members.fetch(author.id);
};

const createAuthorFromMessage = async (message)=>{
    const discordId = message.author.id;
    const username = message.author.username;
    const member = await fetchMemberFromDiscordAuthor(message.author);
    const displayName = member.nickname || {};
    return {discordId, username, displayName}
}
const createSuggestionFromMessage = (message)=>{
    const text = message.content;
    const token = message.token;
    const messageId = message.id
    return {text, token, messageId};
}

const addNewSuggestionFromApi = async(messageId)=>{
    const message = await fetchMessage(messageId);
    const author = await createAuthorFromMessage(message);
    const suggestion = createSuggestionFromMessage(message);
    addNewSuggestion(author, suggestion)
}

module.exports = {addNewSuggestionFromApi};
