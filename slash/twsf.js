const {SlashCommandBuilder} = require('@discordjs/builders');
const {responses} = require('../src/interaction-config.json');
const {storeNewTwsfGuess} = require('./utilities/title-utilities');

const data = new SlashCommandBuilder()
    .setName('twsf')
    .setDescription('Submit a guess for This Week in Spaceflight History')
    .addStringOption((o) =>
        o
            .setName('guess')
            .setDescription("Your guess for next week's event.")
            .setRequired(true),
    )
    .toJSON();

const execute = async (interaction) => {
    console.log(`${interaction.user.username} used /twsf`);
    try {
        const success = await addNewDiscordTwsfGuess(interaction);
        if (success) {
            interaction.reply(responses.acknowledge);
        } else {
            interaction.reply(responses.error);
        }
    } catch (error) {
        interaction.reply(responses.failure);
        console.error('slash/twsf failed in an unexpected way.');
        console.error(error);
    }
};

module.exports = {data, execute};
