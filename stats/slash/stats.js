const {SlashCommandBuilder} = require('@discordjs/builders');
const {codeBlock} = require('@discordjs/builders');

const {getAuthorTwsfScore, getTwsfHighScores} = require('../../database/twsf');
const {
    getAuthorSubmissionCount,
    getSubmissionHighScores,
    getAuthorVotesCast,
    getVotesCastHighScores,
    getAuthorVotesEarned,
    getVotesEarnedHighScores,
} = require('../../database/suggestions');
const {responses} = require('../../config/discord-interaction.json');

/*--------------------*\
  USER MESSAGE BUILDER
\*--------------------*/
const buildUserMessage = async (discordId) => {
    const {score, bonusPoints} = await getAuthorTwsfScore(discordId);
    const {submissions} = await getAuthorSubmissionCount(discordId);
    const {votesCast} = await getAuthorVotesCast(discordId);
    const {votesEarned} = await getAuthorVotesEarned(discordId);

    const message = responses.stats
        .join('\n')
        .replace('<bonusPoints>', bonusPoints || '0')
        .replace('<score>', score || '0')
        .replace('<submissions>', submissions || '0')
        .replace('<cast>', votesCast || '0')
        .replace('<earned>', votesEarned || '0');

    return codeBlock(message);
};

/*---------------------------*\
  LEADERBOARD MESSAGE BUILDER
\*---------------------------*/
const buildLeaderboardString = ({discordId, callsign, ...rest}) => {
    const score =
        rest.score || rest.submissions || rest.votesCast || rest.votesEarned;
    const scoreStr = score.toString().padStart(5, ' ');
    const name = discordId ? `<@${discordId}>` : callsign;
    return `${scoreStr} - ${name}`;
};
const buildLeaderboardMessage = async () => {
    // Configure headers and the DB calls assocaited with them
    const actionList = [
        [responses.stats.leaderboard.twsf, getTwsfHighScores],
        [responses.stats.leaderboard.submissions, getSubmissionHighScores],
        [responses.stats.leaderboard.cast, getVotesCastHighScores],
        [responses.stats.leaderboard.earned, getVotesEarnedHighScores],
    ];

    // Make db calls, format the results
    const messageLines = [];
    for (const [header, func] of actionList) {
        messageLines.push(header);
        const scores = await func();
        const scoreString = scores.map(buildLeaderboardString).join('\n');
        messageLines.push(scoreString);
    }

    // Join everything into one string
    return messageLines.join('\n');
};

/*--------*\
  HANDLERS
\*--------*/
const handleUserRequest = async (interaction) => {
    // Who are we looking up?
    const query = interaction.options.getUser('query') || interaction.user;
    interaction.client.logger.info(`Query user is ${query.username}`);

    // Build a response
    const stats = await buildUserMessage(query.id);
    const content = `${query.username}'s stats:${stats}`;

    // Set ephemeral, default to true;
    let ephemeral = interaction.options.getBoolean('hidden');
    if (ephemeral === null) ephemeral = true;

    // Send response
    interaction.reply({content, ephemeral});
};
const handleLeaderboardRequest = async (interaction) => {
    // Build a response
    const content = await buildLeaderboardMessage();

    // Set ephemeral, default to true;
    let ephemeral = interaction.options.getBoolean('hidden');
    if (ephemeral === null) ephemeral = true;

    // Send response
    interaction.reply({content, ephemeral});
};

/*-------*\
  Exports
\*-------*/
const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View listener statistics.')
    .addSubcommand((subcommand) =>
        subcommand
            .setName('user')
            .setDescription("Look up a single user's statistics")
            .addUserOption((option) =>
                option
                    .setName('query')
                    .setDescription(
                        'The user you want to view. Leave blank to view your own stats.',
                    ),
            )
            .addBooleanOption((option) =>
                option
                    .setName('hidden')
                    .setDescription(
                        'If hidden, the response will be visible to you only. Defaults to true.',
                    ),
            ),
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName('leaderboard')
            .setDescription('View the global high scores.')
            .addBooleanOption((option) =>
                option
                    .setName('hidden')
                    .setDescription(
                        'If hidden, the response will be visible to you only. Defaults to true.',
                    ),
            ),
    )
    .toJSON();

const execute = async (interaction) => {
    const subCommand = interaction.options.getSubcommand();
    interaction.client.logger.info(
        `${interaction.user.username} used /stats ${subCommand}.`,
    );
    try {
        if (subCommand === 'leaderboard') handleLeaderboardRequest(interaction);
        else handleUserRequest(interaction);
    } catch (error) {
        interaction.client.logger.error(error);
        interaction.reply(responses.failure);
    }
};

module.exports = {data, execute};
