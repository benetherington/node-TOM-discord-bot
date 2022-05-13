const {SlashCommandBuilder} = require('@discordjs/builders');
const {ApplicationCommandPermissionType} = require('discord-api-types/v9');
const {responses: config} = require('../../config/discord-interaction.json');
const ID = require('../../config/discord-id.json');
const {addNewEpisode} = require('../../database/suggestions');

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

let execute = async (interaction) => {
    let epNum = interaction.options.getInteger('ep_num');
    console.log(`Starting new episode ${epNum}.`);
    try {
        let success = await addNewEpisode(epNum);
        if (success) {
            interaction.reply(config.acknowledge);
            // TODO: silly. Welcome everyone to City [epNum] https://static.wikia.nocookie.net/half-life/images/c/cb/Breencast_first.jpg/revision/latest/top-crop/width/360/height/360?cb=20091026102502&path-prefix=en
        } else {
            interaction.reply(config.error);
            console.error(
                `sqlite.addNewEpisode returned false. epNum ${epNum}`,
            );
        }
    } catch (error) {
        interaction.reply(config.failure);
        console.error('slash/new failed in an unexpected way.');
        console.error(error);
    }
};

module.exports = {data, execute};
