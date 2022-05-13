const {MessageActionRow, MessageButton} = require('discord.js');
const {addNewSuggestion} = require('../../../database/suggestions');

const createAuthorFromInteraction = (interaction) => {
    const discordId = interaction.user.id;
    const username = interaction.user.username;
    const member = interaction.member || {};
    const displayName = member.displayName || {};
    return {discordId, username, displayName};
};

const createSuggestionFromInteraction = (interaction) => {
    const text = interaction.options.getString('suggestion');
    const token = interaction.token;
    return {text, token};
};

const formatTitleReply = (author, suggestion, voteCount = 1) => {
    const content = `<@${author.discordId}>: \`${suggestion.text}\``;
    const button = new MessageButton()
        .setLabel(`(${voteCount}) VOTE`)
        .setStyle('SUCCESS')
        .setCustomId(suggestion.suggestionId.toString());
    const row = new MessageActionRow().addComponents(button);
    return {content, components: [row]};
};

const getNewSuggestionMessage = async (interaction) => {
    const author = createAuthorFromInteraction(interaction);
    const suggestion = createSuggestionFromInteraction(interaction);

    console.log(`Adding suggstion: ${suggestion.text}`);
    const storedSuggestion = await addNewSuggestion(author, suggestion);
    return formatTitleReply(author, storedSuggestion);
};

module.exports = {getNewSuggestionMessage};
