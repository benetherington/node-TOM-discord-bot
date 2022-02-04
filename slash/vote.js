const {MessageActionRow, MessageButton} = require('discord.js');
const {SlashCommandBuilder} = require('@discordjs/builders');
const {getSuggestionsWithCountedVotes} = require("../src/sqlite.js");

let data = new SlashCommandBuilder()
    .setName("vote")
    .setDescription("Begin a new voting round")
    .addSubcommand(subcommand=>
        subcommand
            .setName("for_episode")
            .setDescription("Summarize suggestions for a past episode")
            .addIntegerOption(option=>
                option
                    .setName("ep_num")
                    .setDescription("Episode Number (defaults to previous)")
                    .setRequired(false)
            )
    ).toJSON()
;





const formatVoteRow = ({author, suggestion, voteCount=1})=>{
    // Turn votes into MessageButtons inside a MessageActionRow
    const label = `(${voteCount}) <@${author.discordId}>: \`${suggestion.text}\``;
    const button = new MessageButton()
        .setLabel(label)
        .setStyle("PRIMARY")
        .setCustomId(suggestion.suggestionId.toString())
    return new MessageActionRow().setComponents(button)
}

const formatVoteReply = (countedSuggestionChunk)=>{
    const voteRows = countedSuggestionChunk.map(formatVoteRow);
    return {content:"VOTE:", components: voteRows}
}
// PICKUP: this is ugly, and the mention is not resolved.

const chunkArray = (toChunk, chunkSize)=>{
    let chunked = [];
    while (toChunk.length) {
        chunked.push(toChunk.splice(0,chunkSize));
    }
    return chunked;
}

const formatVoteReplies = (allCountedSuggestions)=>{
    // Messages can only contain five MessageActionRows.
    // Break [allCountedSuggestions] into arrays of 5 suggestions each, then turn
    // each chunk into a reply with five rows of one button each.
    const countedSuggestionChunks = chunkArray(allCountedSuggestions, 5);
    return countedSuggestionChunks.map(formatVoteReply)
}




const execute = async (interaction)=>{
    console.log("New vote request from "+interaction.user.username)
    // PICK epNum
    const episode = {epNum:null};
    if (interaction.options.getSubcommand()==="for_episode") {
        episode.epNum = interaction.options.getInteger("ep_num");
    }
    
    // RETRIEVE Suggestions
    const allCountedSuggestions = await getSuggestionsWithCountedVotes(episode);
    console.log(`Found ${allCountedSuggestions.length} suggestions to vote on`)
    
    // BUILD response/s
    const responses = formatVoteReplies(allCountedSuggestions);
    // TODO:Delete the most recent vote message.
    // SEND responses
    await interaction.reply(responses.pop())
    while (responses.length) {
        await interaction.followUp(responses.pop())
    }
};

module.exports = {data, execute}
