const {addNewTwsfGuess} = require('../../src/sqlite/twsf');

const createGuesserFromInteraction = (interaction) => {
    const discordId = interaction.user.id;
    const discordIsername = interaction.user.username;
    const member = interaction.member || {};
    const discordDisplayName = member.displayName || {};
    return {discordId, discordIsername, discordDisplayName};
};

const addNewDiscordTwsfGuess = async (interaction) => {
    const author = createGuesserFromInteraction(interaction);
    const guess = {
        type: 'discord',
        text: interaction.options.getString('guess'),
        token: interaction.token,
    };

    return addNewTwsfGuess({author, guess});
};

module.exports = {addNewDiscordTwsfGuess};
