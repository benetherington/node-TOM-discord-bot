const {MessageActionRow, MessageButton} = require('discord.js');
const {addNewSuggestion} = require('../../../database/suggestions');

const formatTitleReply = (author, suggestion, voteCount = 1) => {
    const content = `<@${author.discordId}>: \`${suggestion.text}\``;
    const button = new MessageButton()
        .setLabel(`(${voteCount}) VOTE`)
        .setStyle('SUCCESS')
        .setCustomId(suggestion.suggestionId.toString());
    const row = new MessageActionRow().addComponents(button);
    return {content, components: [row]};
};

const createAuthorFromInteraction = (interaction) => {
    // User properties will always be available
    const discordId = interaction.user.id;
    const username = interaction.user.username;

    // Member properties SHOULD be available, but if a slash is invoked from a
    // direct message, etc, we'd have to do an additional server call to fetch
    // them.
    const member = interaction.member || {};
    const displayName = member.displayName || '';

    const callsign = member.nickname || displayName || username;
    return {discordId, username, displayName, callsign};
};
module.exports.createAuthorFromInteraction = createAuthorFromInteraction;

module.exports.getNewSuggestionMessage = async (interaction) => {
    const author = createAuthorFromInteraction(interaction);
    const text = interaction.options.getString('suggestion');

    interaction.client.logger.info(`Adding suggstion: ${text}`);
    const suggestionId = await addNewSuggestion(author, {text});
    return formatTitleReply(author, {text, suggestionId});
};
