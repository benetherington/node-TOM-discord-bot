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

/*---------*\
  UTILITIES
\*---------*/
const getStatsMessageContent = async (discordId) => {
    const {score, bonusPoints} = await getAuthorTwsfScore(discordId);
    const {submissions} = await getAuthorSubmissionCount(discordId);
    const {votesCast: cast} = await getAuthorVotesCast(discordId);
    const {earned} = await getAuthorVotesEarned(discordId);

    const message = responses.stats
        .join('\n')
        .replace('<bonusPoints>', bonusPoints || '0')
        .replace('<score>', score || '0')
        .replace('<submissions>', submissions || '0')
        .replace('<cast>', cast || '0')
        .replace('<earned>', earned || '0');

    return codeBlock(message);
};

const buildLeaderboardString = ({points, discordId, callsign}) => {
    const pointsStr = points.toString().padStart(5, ' ');
    const name = discordId ? `<@${discordId}>` : callsign;
    return `${pointsStr} - ${name}`;
};
const getLeaderboardMessage = async () => {
    const message = [];

    // Add TWSF stats
    message.push('This Week in Spaceflight History total points:');
    const twsf = await getTwsfHighScores();
    const twsfLines = twsf.map(buildLeaderboardString);
    message.push(twsfLines.join('\n'));

    // Add title suggestion stats
    message.push('Episode titles submitted:');
    const submissions = await getSubmissionHighScores();
    const submissionsLines = submissions.map(buildLeaderboardString);
    message.push(submissionsLines.join('\n'));

    message.push('Episode title votes cast:');
    const cast = await getVotesCastHighScores();
    const castLines = cast.map(buildLeaderboardString);
    message.push(castLines.join('\n'));

    message.push('Episode title votes earned:');
    const earned = await getVotesEarnedHighScores();
    const earnedLines = earned.map(buildLeaderboardString);
    message.push(earnedLines.join('\n'));

    const messages = message.join('\n');
    console.log(messages);
    return messages;
};

/*--------*\
  HANDLERS
\*--------*/
const handleUserRequest = async (interaction) => {
    // Who are we looking up?
    const query = interaction.options.getUser('query') || interaction.user;
    console.log(`Query user is ${query.username}`);

    // Build a response
    const stats = await getStatsMessageContent(query.id);
    const content = `${query.username}'s stats:${stats}`;

    // Set ephemeral
    let ephemeral = interaction.options.getBoolean('hidden');
    if (ephemeral === null) ephemeral = true;

    // Send response
    interaction.reply({content, ephemeral});
};
const handleLeaderboardRequest = async (interaction) => {
    // Build a response
    const content = await getLeaderboardMessage();

    // Set ephemeral
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
    console.log(`${interaction.user.username} used /stats ${subCommand}.`);
    try {
        if (subCommand === 'leaderboard') handleLeaderboardRequest(interaction);
        else handleUserRequest(interaction);
    } catch (error) {
        console.error(error);
        interaction.reply(responses.failure);
    }
};

module.exports = {data, execute};
