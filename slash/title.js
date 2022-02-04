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

const createAuthorFromInteraction = (interaction)=>{
    const discordId = interaction.user.id;
    const username = interaction.user.username;
    const member = interaction.member || {};
    const displayName = member.displayName || {};
    return {discordId, username, displayName}
}

const createSuggestionFromInteraction = (interaction)=>{
    const text = interaction.options.getString("suggestion");
    const token = interaction.token;
    return {text, token}
}

const formatTitleReply = (author, suggestion, voteCount=1)=>{
    const content = `<@${author.discordId}>: \`${suggestion.text}\``;
    const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setLabel(`(${voteCount}) VOTE`)
                .setStyle("SUCCESS")
                .setCustomId(suggestion.suggestionId.toString())
        )
    return {content, components: [row]}
}

const execute = async (interaction)=>{
    const author = createAuthorFromInteraction(interaction);
    const suggestion = createSuggestionFromInteraction(interaction);
    
    // log early, log often
    console.log(`New suggstion from ${author.displayName || author.username}: ${suggestion.text}`)

    // RESPOND
    try {
        const storedSuggestion = await addNewSuggestion(author, suggestion)
        if (storedSuggestion) {
            interaction.reply(
                formatTitleReply(author, storedSuggestion)
            )
        } else {
            interaction.reply(responses.error)
        }
    } catch (error) {
        interaction.reply(responses.failure)
        console.error("slash/title failed in an unexpected way.")
        console.error(error)
    }
};

module.exports = {data, execute, formatTitleReply}
