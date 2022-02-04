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





const formatVoteButton = (author, suggestion, voteCount=1)=>{
    // Turn votes into MessageButtons
    const label = `(${voteCount}) <@${author.discordId}>: \`${suggestion.text}\``;
    return new MessageButton()
        .setLabel(label)
        .setStyle("PRIMARY")
        .setCustomId(suggestion.suggestionId.toString())
}

const formatVoteRow = (votes)=>{
    // Turn votes into MessageButtons, put them in a MessageActionRow.
    const voteComponents = votes.map(formatVoteButton);
    return new MessageActionRow().setComponents(voteComponents);
}
// PICKUP: this is all untested

const formatVoteReplies = (votes)=>{
    // Messages can only contain five MessageActionRows.
    // Break [votes] into arrays of 5 votes each.
    let suggestionChunks = [];
    while (votes.length) {
        suggestionChunks.append(votes.splice(0,5))
    }
    const components = suggestionChunks.map(formatVoteRow);
    return {content:"", components}
}




const execute = async (interaction)=>{
    // PICK epNum
    const episode = {epNum};
    if (interaction.options.getSubcommand()==="for_episode") {
        episode.epNum = interaction.options.getInteger("ep_num");
    }
    
    // RETRIEVE Suggestions
    const votes = getSuggestionsWithCountedVotes(episode);
    
    // BUILD response/s
    const responses = formatVoteReplies(votes);
    
    // Delete the most recent vote message.
    // Add a button for each suggestion, depending on API attach a vote event to it?
};

module.exports = {data, execute}
