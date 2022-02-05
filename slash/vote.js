const {MessageActionRow, MessageButton, MessageEmbed} = require('discord.js');
const {SlashCommandBuilder} = require('@discordjs/builders');
const {getSuggestionsWithCountedVotes} = require("../src/sqlite.js");

let data = new SlashCommandBuilder()
    .setName("vote")
    .setDescription("Begin a new voting round")
    .toJSON()
;

const chunkArray = (toChunk, chunkSize)=>{
    let chunked = [];
    while (toChunk.length) {
        chunked.push(toChunk.splice(0,chunkSize));
    }
    return chunked;
}
const formatVoteButton = ({author, suggestion, voteCount=1})=>{
    // Turns a countedSuggestion into a button.
    return new MessageButton()
        .setLabel(`(${voteCount}) ${author.displayName||author.username}: ${suggestion.text}`)
        .setStyle("SECONDARY")
        .setCustomId(suggestion.suggestionId.toString())
};
const formatVoteRow = (countedSuggestionRowChunk)=>{
    // Turns an array of countedSuggestions into a MessageActionRow
    const buttons = countedSuggestionRowChunk.map(formatVoteButton)
    return new MessageActionRow().setComponents(buttons)
};
const formatVoteMessage = (countedSuggestionMessageChunk)=>{
    // Turns an array of countedSuggestions into an InteractionReplyOption.
    const countedSuggestionRowChunks = chunkArray(countedSuggestionMessageChunk, 5)
    const components = countedSuggestionRowChunks.map(formatVoteRow);
    return {content:"Title suggestions so far:", components}
};
const getVoteReplies = (allCountedSuggestions)=>{
    // Turns an array of countedSuggestions into an array of InteractionReplyOptions.
    const countedSuggestionMessageChunks = chunkArray(allCountedSuggestions, 5*5);
    return countedSuggestionMessageChunks.map(formatVoteMessage)
};

const execute = async (interaction)=>{
    console.log("New vote request from "+interaction.user.username)
    
    // RETRIEVE Suggestions
    const allCountedSuggestions = await getSuggestionsWithCountedVotes();
    console.log(`Found ${allCountedSuggestions.length} suggestions to vote on`)
    
    // BUILD response/s
    const responses = getVoteReplies(allCountedSuggestions);
    // TODO:Delete the most recent vote message.
    
    try {
        // SEND first reply
        await interaction.reply(responses.shift())
        // SEND follow ups
        while (responses.length) {
            await interaction.followUp(responses.shift())
        }
    } catch (error) {
        console.log(error)
    }
};

module.exports = {data, execute}
