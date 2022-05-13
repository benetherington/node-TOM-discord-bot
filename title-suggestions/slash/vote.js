const {SlashCommandBuilder} = require('@discordjs/builders');
const {getVoteMessages} = require('./utilities/vote-utilities');
const {responses: config} = require("../../config/discord-interaction.json");

const data = new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Begin a new voting round')
    .toJSON();
const execute = async (interaction) => {
    console.log(`${interaction.user.username} used /vote`);

    try {
        const responses = await getVoteMessages();
        if (responses.length === 0) {
            // No suggestions yet
            interaction.reply({
                content: 'No title suggestions yet!',
                ephemeral: true,
            });
        } else {
            // TODO:Delete the most recent vote message.
            // SEND reply and followups
            await interaction.reply(responses.shift());
            while (responses.length) {
                await interaction.followUp(responses.shift());
            }
        }
    } catch (error) {
        console.log(error);
    }
};

module.exports = {data, execute};
