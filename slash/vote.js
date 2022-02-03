const {MessageActionRow, MessageButton} = require('discord.js');
const {SlashCommandBuilder} = require('@discordjs/builders');
const {responses} = require("../src/interaction-config.json");
const {getCurrentEpNum, getSuggestionsWithCountedVotes} = require("./src/sqlite.js")

let data = new SlashCommandBuilder()
    .setName("vote")
    .setDescription("Begin a new voting round")
    .addSubcommand(subcommand=>
        subcommand
            .setName("forEpisode")
            .setDescription("Summarize suggestions for a past episode")
            .addIntegerOption(option=>
                option
                    .setName("epNum")
                    .setDescription("Episode Number (defaults to previous)")
                    .setRequired(false)
            )
    ).toJSON()
;

const execute = async (interaction)=>{
    // PICK epNum
    const episode = {epNum};
    if (interaction.options.getSubcommand()==="forEpisode") {
        episode.epNum = interaction.options.getInteger("epNum");
    }
    
    // RETRIEVE Suggestions
    const suggestions = getSuggestionsWithCountedVotes(episode);
    
    // Delete the most recent vote message.
    // Build a new vote message with the Author's name and the suggestion text.
    // Add a button for each suggestion, depending on API attach a vote event to it?
};

module.exports = {data, execute}
