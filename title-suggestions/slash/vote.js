const {SlashCommandBuilder} = require('@discordjs/builders');
const {getVoteMessages} = require('./utilities/vote-utilities');
const {responses: config} = require('../../config/discord-interaction.json');

const data = new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Begin a new voting round')
    .toJSON();
const execute = async (interaction) => {
    console.log(`${interaction.user.username} used /vote`);
    await interaction.deferReply();

    try {
        const responses = await getVoteMessages();
        if (responses.length === 0) {
            // No suggestions yet
            interaction.editReply(config.nothingToVoteOn);
        } else {
            // TODO:Delete the most recent vote message.
            // SEND reply and followups
            await interaction.editReply(responses.shift());
            while (responses.length) {
                await interaction.followUp(responses.shift());
            }
        }
    } catch (error) {
        interaction.editReply(config.failure);
        console.log(error);
    }
};

module.exports = {data, execute};
