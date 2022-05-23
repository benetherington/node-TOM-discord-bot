const {SlashCommandBuilder} = require('@discordjs/builders');
const {responses} = require('../../config/discord-interaction.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Help and info'),
    async execute(interaction) {
        // TODO: complete help string
        const responseOptions = responses.help;
        responseOptions.content = responseOptions.content.join(' ');
        interaction.reply(responseOptions);
    },
};
