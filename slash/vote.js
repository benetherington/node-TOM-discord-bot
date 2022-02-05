const {MessageActionRow, MessageButton, MessageEmbed} = require('discord.js');
const {SlashCommandBuilder} = require('@discordjs/builders');
const {getSuggestionsWithCountedVotes} = require("../src/sqlite.js");

let data = new SlashCommandBuilder()
    .setName("vote")
    .setDescription("Begin a new voting round")
    .toJSON()
;

const buttonColors = [
    {style:"PRIMARY",   color:"#5865f2"},
    {style:"SECONDARY", color:"#4f545c"},
    {style:"SUCCESS",   color:"#3ba55c"},
    {style:"DANGER",    color:"#ed4245"}
]

const chunkArray = (toChunk, chunkSize)=>{
    let chunked = [];
    while (toChunk.length) {
        chunked.push(toChunk.splice(0,chunkSize));
    }
    return chunked;
}




const formatVoteButton = (style, {author, suggestion, voteCount=1})=>{
    // Returns a formatted button
    return new MessageButton()
        .setLabel(`VOTE`)
        .setStyle(style)
        .setCustomId(suggestion.suggestionId.toString())
}
const formatVoteButtons = (countedSugestionChunk)=>{
    // Returns a MessageActionRow full of buttons
    const buttons = countedSugestionChunk.map((countedSuggestion, idx)=>{
        const style = buttonColors[idx].style;
        return formatVoteButton(style, countedSuggestion)
    })
    return [new MessageActionRow().setComponents(buttons)]
}

const formatVoteEmbed = (color, {author, suggestion, voteCount=1})=>{
    // Returns a formatted embed
    return new MessageEmbed()
        .setColor(color)
        .setTitle(author.displayName || author.username)
        .setDescription(suggestion.text);
}
const formatVoteEmbeds = (countedSuggestionChunk)=>{
    return countedSuggestionChunk.map((countedSuggestion, idx)=>{
        const color = buttonColors[idx].color;
        return formatVoteEmbed(color, countedSuggestion)
    })
}

const formatVoteReply = (countedSuggestionChunk)=>{
    // Takes (up to five) countedSuggestions, turns them into MessageActionRows
    // with a button in each. Returns an InteractionReplyOptions Object.
    const components = formatVoteButtons(countedSuggestionChunk);
    const embeds = formatVoteEmbeds(countedSuggestionChunk);
    return {content:"VOTE:", components, embeds}
}
const formatVoteReplies = (allCountedSuggestions)=>{
    // Messages can only contain five MessageActionRows.
    // Break [allCountedSuggestions] into arrays of 5 suggestions each, then turn
    // each chunk into a reply with five rows of one button each.
    const countedSuggestionChunks = chunkArray(allCountedSuggestions, 4);
    return countedSuggestionChunks.map(formatVoteReply)
}




const execute = async (interaction)=>{
    console.log("New vote request from "+interaction.user.username)
    
    // RETRIEVE Suggestions
    const allCountedSuggestions = await getSuggestionsWithCountedVotes();
    console.log(`Found ${allCountedSuggestions.length} suggestions to vote on`)
    
    // BUILD response/s
    const responses = formatVoteReplies(allCountedSuggestions);
    // TODO:Delete the most recent vote message.
    
    // SEND responses
    try {
        await interaction.reply(responses.pop())
    } catch (error) {
        console.log(error)
    }
    while (responses.length) {
        await interaction.followUp(responses.pop())
    }
};

module.exports = {data, execute}
