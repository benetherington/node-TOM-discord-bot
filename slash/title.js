const {MessageActionRow, MessageButton} = require('discord.js');
const {SlashCommandBuilder} = require('@discordjs/builders');
const {responses} = require("../src/interaction-config.json");
const {addNewSuggestion} = require("../src/sqlite.js");
const { format } = require('express/lib/response');


let data = new SlashCommandBuilder()
    .setName('title')
    .setDescription('Suggest a new title for this episode')
    .addStringOption(o=>
        o.setName("suggestion")
         .setDescription("Your suggestion")
         .setRequired(true)
    ).toJSON();


const formatTitleReply = (user, interaction, suggestionId)=>{
    const content = `(1) <@${user.id}>: \`${interaction.options.getString("suggestion")}\``;
    const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setLabel("VOTE")
                .setStyle("SUCCESS")
                .setCustomId(suggestionId.toString())
        )
    return {content, row}
}

const execute = async (interaction)=>{
    // log early, log often
    const suggestionString = interaction.options.getString("suggestion");
    const user = interaction.user;
    const member = interaction.member || {};
    console.log(`New suggstion from ${member.displayName || user.username}: ${suggestionString}`)

    // DATA
    let author = {
        discordId: user.id,
        name: user.username,
        nick: member.displayName
    };
    let suggestion = {
        suggestion: suggestionString,
        messageId: interaction.token
    };

    // RESPOND
    try {
        const suggestionId = await addNewSuggestion(author, suggestion)
        if (suggestionId) {
            interaction.reply(formatTitleReply(user, interaction, suggestionId))
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