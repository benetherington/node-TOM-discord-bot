const {SlashCommandBuilder} = require('@discordjs/builders');
const {
    addNewGuess,
    updateGuessDiscordReply,
    guessTypes,
} = require('../../../database/twsf');
const {
    createAuthorFromInteraction,
} = require('../../../title-suggestions/slash/utilities/title-utilities');

const {responses} = require('../../../config/discord-interaction.json');
const ID = require('../../../config/discord-id.json');

/*---------*\
  Utilities
\*---------*/
const getTwsfChannelMessage = (interaction) => {
    const messageOptions = {...responses.twsf.twsfChannelMessage};
    messageOptions.content = messageOptions.content
        .replace('id', interaction.user.id)
        .replace('txt', interaction.options.getString('guess'));

    return messageOptions;
};
const createGuessFromInteraction = (interaction) => {
    const type = guessTypes.DISCORD;
    const rawText = interaction.options.getString('guess');
    // If the user tried to spoiler their submission, delete the spoiler
    // formatting: || at the beginning and end.
    const text = rawText.replace(/(^\|\|)(.*)(\|\|$)/, '$2');

    return {type, text};
};

/*-------------------*\
  Subcommand handlers
\*-------------------*/
const handleNewGuess = async (interaction) => {
    // Format for the DB
    const guess = createGuessFromInteraction(interaction);
    const author = createAuthorFromInteraction(interaction);

    // Validate
    if (!guess.text || !author) {
        interaction.client.logger.error(
            'Failed to create TWSF guess or author from slash command!',
            interaction.toString(),
        );
        return interaction.reply(responses.error);
    }

    // Store this guess
    const storedGuess = addNewGuess({guess, author});
    if (!storedGuess) {
        interaction.client.logger.error(
            'Failed to store TWSF guess from slash command!',
            interaction.toString(),
            {guess, author},
        );
        return interaction.reply(responses.failure);
    }

    // Send acknowledgement
    await interaction.reply(responses.twsf.guessAccepted);

    // If the reply wasn't hidden, store its ID
    const hiddenOption = interaction.options.getBoolean('hidden');
    const postToTwsfChannel = hiddenOption || hiddenOption === null; // default True
    if (postToTwsfChannel) {
        const messageOptions = getTwsfChannelMessage(interaction);
        const twsfChannel = await interaction.client.channels.fetch(
            ID.channel.thisweeksf,
        );
        const postedMessage = await twsfChannel.send(messageOptions);
        updateGuessDiscordReply(guess, postedMessage.id);
    }
};
const handleClueRequest = async (interaction) => {
    await interaction.deferReply({ephemeral: true});
    const twsfChannel = await interaction.client.channels.fetch(
        ID.channel.thisweeksf,
    );
    const recentMessages = await twsfChannel.messages.fetch({limit: 20});
    const lastTwsfMessage = recentMessages.find(
        (m) =>
            m.author.id === ID.user.ben && m.content.startsWith('Next week ('),
    );

    if (lastTwsfMessage)
        return interaction.editReply({content: lastTwsfMessage.content});
    else interaction.editReply(responses.twsf.guessNotFound);
};

/*-------*\
  Exports
\*-------*/
const data = new SlashCommandBuilder()
    .setName('twsf')
    .setDescription('This Week in Spaceflight History')
    .addSubcommand((subcommand) =>
        subcommand
            .setName('guess')
            .setDescription("Submit a guess for this week's clue.")
            .addStringOption((option) =>
                option
                    .setName('guess')
                    .setDescription("Your guess for next week's event.")
                    .setRequired(true),
            )
            .addBooleanOption((option) =>
                option
                    .setName('hidden')
                    .setDescription(
                        "Should this guess be for the TOM crew's eyes only? Defaults to false if left blank.",
                    ),
            ),
    )
    .addSubcommand((subcommand) =>
        subcommand.setName('clue').setDescription("View this week's clue."),
    )
    .toJSON();
const execute = async (interaction) => {
    const username = interaction.user.username;
    const subCommand = interaction.options.getSubcommand();
    interaction.client.logger.info(`${username} used /twsf ${subCommand}`);

    try {
        if (interaction.options.getSubcommand() === 'guess') {
            await handleNewGuess(interaction);
        } else if (interaction.options.getSubcommand() === 'clue') {
            await handleClueRequest(interaction);
        }
    } catch (error) {
        interaction.client.logger.error(error);
        if (interaction.deferred) interaction.editReply(responses.failure);
        else interaction.reply(responses.failure);
    }
};

module.exports = {data, execute};
