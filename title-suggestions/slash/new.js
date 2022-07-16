const {SlashCommandBuilder} = require('@discordjs/builders');
const {ApplicationCommandPermissionType} = require('discord-api-types/v9');
const {responses: config} = require('../../config/discord-interaction.json');
const ID = require('../../config/discord-id.json');
const {addNewEpisode} = require('../../database/suggestions');
const {clearChatThanks} = require('../../database/thankyou');

let data = new SlashCommandBuilder()
    .setName('new')
    .setDescription('Starts a new episode recording')
    .setDefaultPermission(false)
    .addIntegerOption((o) =>
        o.setName('ep_num').setDescription('Episode number').setRequired(true),
    )
    .toJSON();
data.permissions = [
    {
        id: ID.role.tomCrew,
        type: ApplicationCommandPermissionType.Role,
        permission: true,
    },
];

// TODO: silly. Welcome everyone to City [epNum] https://static.wikia.nocookie.net/half-life/images/c/cb/Breencast_first.jpg/revision/latest/top-crop/width/360/height/360?cb=20091026102502&path-prefix=en
let execute = async (interaction) => {
    // Extract requested new episode number
    const epNum = interaction.options.getInteger('ep_num');
    interaction.client.logger.info(`Starting new episode ${epNum}.`);
    try {
        // Add new episode
        const {changes: episodeCreated} = await addNewEpisode(epNum);

        // Reset chat thank-yous
        await clearChatThanks();

        // Reply
        if (episodeCreated) interaction.reply(config.acknowledge);
        else interaction.reply(config.titleSuggestions.notNewEpisode);
    } catch (error) {
        interaction.reply(config.failure);
        interaction.client.logger.error({
            msg: 'slash/new failed in an unexpected way.',
            error,
        });
    }
};

module.exports = {data, execute};
