const {SlashCommandBuilder} = require('@discordjs/builders');
const {responses: config} = require('../../config/discord-interaction.json');
const {getNewSuggestionMessage} = require('./utilities/title-utilities');

let data = new SlashCommandBuilder()
    .setName('title')
    .setDescription('Suggest a new title for this episode')
    .addStringOption((o) =>
        o
            .setName('suggestion')
            .setDescription('Your suggestion')
            .setRequired(true),
    )
    .toJSON();

const execute = async (interaction) => {
    interaction.client.logger.info(`${interaction.user.username} used /title`);
    try {
        const response = await getNewSuggestionMessage(interaction);
        if (response) interaction.reply(response);
        else interaction.reply(config.error);
    } catch (error) {
        interaction.reply(config.failure);
        interaction.client.logger.error({
            msg: 'slash/title failed in an unexpected way.',
            error
        });
    }
};

module.exports = {data, execute};
