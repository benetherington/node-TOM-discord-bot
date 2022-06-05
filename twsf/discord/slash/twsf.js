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
const getInteractionResponse = (interaction) => {
    const hideReply = interaction.options.getBoolean('hidden');
    if (hideReply) {
        return config.twsf.hiddenReply;
    } else {
        const responseOptions = config.twsf.publicReply;
        responseOptions.content = responseOptions.content
            .replace('id', interaction.user.id)
            .replace('txt', interaction.options.getString('guess'));

        return responseOptions;
    }
};
const createGuessFromInteraction = (interaction) => {
    const type = guessTypes.DISCORD;
    const rawText = interaction.options.getString('guess');
    // If the user tried to spoiler their submission, delete the spoiler
    // formatting: || at the beginning and end.
    const text = rawText.replace(/(^\|\|)(.*)(\|\|$)/, "$2");
    
    return {type, text}
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
        console.error(
            'Failed to create TWSF guess or author from slash command!',
        );
        console.error(interaction.toString());
        interaction.reply(responses.error);
        return;
    }

    // Store this guess
    const storedGuess = addNewGuess({guess, author});
    if (!storedGuess) {
        console.error('Failed to store TWSF guess from slash command!');
        console.error(interaction.toString());
        console.error(guess);
        console.error(author);
        interaction.reply(responses.failure);
    }

    // Build and send reply
    const responseOptions = getInteractionResponse(interaction);
    const commandReply = await interaction.reply(responseOptions);

    // If the reply wasn't hidden, store its ID
    if (commandReply) updateGuessDiscordReply(guess, commandReply.id);
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

    interaction.editReply({content: lastTwsfMessage.content});
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
    console.log(`${username} used /twsf ${subCommand}`);

    try {
        if (interaction.options.getSubcommand() === 'guess') {
            await handleNewGuess(interaction);
        } else if (interaction.options.getSubcommand() === 'clue') {
            await handleClueRequest(interaction);
        }
    } catch (error) {
        if (interaction.deferred) interaction.editReply(responses.failure);
        else interaction.reply(responses.failure);
        console.error(error);
    }
};

module.exports = {data, execute};
