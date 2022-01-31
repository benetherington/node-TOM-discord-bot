const {MessageActionRow, MessageButton} = require('discord.js');
const {SlashCommandBuilder} = require('@discordjs/builders');
const {responses} = require("../src/interaction-config.json");
const {addNewSuggestion} = require("../src/sqlite.js");


let data = new SlashCommandBuilder()
    .setName('title')
    .setDescription('Suggest a new title for this episode')
    .addStringOption(o=>
        o.setName("suggestion")
         .setDescription("Your suggestion")
         .setRequired(true)
    );

let execute = async (interaction)=>{
    // log early, log often
    let suggestionText = interaction.options.getString("suggestion");
    let user = interaction.user;
    console.log(`New suggstion from ${user.nick || user.name}: ${suggestionText}`)

    // DATA
    let author = {
        discordId: user.id,
        name: user.name,
        nick: user.nick
    };
    let suggestion = {
        messageId: "998",
        suggestion: suggestionText,
        jumpUrl: "http://998.com"
    };

    // RESPOND
    try {
        let success = await addNewSuggestion(author, suggestion)
        if (success) {
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setLabel("VOTE")
                        .setStyle("SUCCESS")
                        .setCustomId()
                )
            interaction.reply({content: suggestionText,
                               components: [row]})
        } else {
            interaction.reply(responses.error)
        }
    } catch (error) {
        interaction.reply(responses.failure)
        console.error("slash/title failed in an unexpected way.")
        console.error(error)
    }
};

module.exports = {data, execute}