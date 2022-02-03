const {MessageActionRow, MessageButton} = require('discord.js');
const {SlashCommandBuilder} = require('@discordjs/builders');
const {responses} = require("../src/interaction-config.json");


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
    ).toJSON();
    

const execute = async (interaction)=>{
    // Delete the most recent vote message.
    // Retrieve all Suggestions associated with the most recent Episode.
    // Build a new vote message with the Author's name and the suggestion text.
    // Add a button for each suggestion, depending on API attach a vote event to it?
};

module.exports = {data, execute}
