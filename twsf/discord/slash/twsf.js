const {SlashCommandBuilder} = require('@discordjs/builders');
const {responses} = require('../../../config/discord-interaction.json');
const {addNewTwsfGuess, updateTwsfGuess} = require('../../../database/twsf');
const {responses: config} = require('../../../config/discord-interaction.json');
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
const guessAndAuthorFromInteraction = (interaction) => {
    // DisplayNames are only available within a guild. We should mostly be doing
    // interactions within a guild, but if someone DMs the bot, their member
    // object will be null.
    const member = interaction.member || {};
    const discordDisplayName = member.displayName || '';
    const author = {
        discordId: interaction.user.id,
        discordUsername: interaction.user.username,
        discordDisplayName,
    };

    const guess = {
        type: 'discord',
        text: interaction.options.getString('guess'),
    };

    return {author, guess};
};

/*-------------------*\
  Subcommand handlers
\*-------------------*/
const handleNewGuess = async (interaction) => {
    // Format for the DB
    const {guess, author} = guessAndAuthorFromInteraction(interaction);
    if (!guess || !author) throw 'Unable to construct guess or author.';

    // Store this guess
    const storedGuess = addNewTwsfGuess({guess, author});
    if (!storedGuess) {
        console.table({guess, author});
        throw 'Unable to store guess and author.';
    }

    // Build and send reply
    const responseOptions = getInteractionResponse(interaction);
    const commandReply = await interaction.reply(responseOptions);

    // If the reply wasn't hidden, store its ID
    if (commandReply) updateTwsfGuess(guess, commandReply.id);
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
module.exports.data = new SlashCommandBuilder()
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
module.exports.execute = async (interaction) => {
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
