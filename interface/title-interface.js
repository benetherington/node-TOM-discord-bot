const {client}           = require("../bot.js");
const {addNewSuggestion, deleteSuggestion} = require("../src/sqlite/suggestions.js");
const ID                 = require("../src/id.json");


const fetchMessage = async(messageId)=>{
    const channelId = process.env.TEST? ID.channel.botTest : ID.channel.groundControl;
    const channel = await client.channels.fetch(channelId);
    
    return await channel.messages.fetch(messageId)
}
const fetchMemberFromDiscordAuthor = (author)=>{
    const tomCastGuild = client.guilds.cache.get(ID.guild.tomCast);
    return tomCastGuild.members.fetch(author.id);
};

const createAuthorFromMessage = async (message)=>{
    const discordId = message.author.id;
    const username = message.author.username;
    const member = await fetchMemberFromDiscordAuthor(message.author);
    const displayName = member.nickname || "";
    return {discordId, username, displayName}
}
const createSuggestionFromMessage = (message)=>{
    const text = message.content;
    const token = message.token;
    const messageId = message.id
    return {text, token, messageId};
}

const addNewSuggestionFromApi = async(messageId)=>{
    console.log(`API creating ${messageId}`)
    
    const message = await fetchMessage(messageId);
    const author = await createAuthorFromMessage(message);
    const suggestion = createSuggestionFromMessage(message);
    addNewSuggestion(author, suggestion)
}
const removeSuggestionFromApi = async (messageId)=>{
    console.log(`API deleting ${messageId}`)
    
    const suggestion = {suggestionId: messageId};
    deleteSuggestion(suggestion)
};

module.exports = {addNewSuggestionFromApi, removeSuggestionFromApi};
