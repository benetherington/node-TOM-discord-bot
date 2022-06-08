const {MessageActionRow, MessageButton} = require('discord.js');
const {
    getSuggestionsWithCountedVotes,
} = require('../../../database/suggestions');
const logger = require('../../../logger');

const chunkArray = (toChunk, chunkSize) => {
    let chunked = [];
    while (toChunk.length) {
        chunked.push(toChunk.splice(0, chunkSize));
    }
    return chunked;
};
const formatVoteButton = ({author, suggestion, voteCount = 1}) => {
    // Turns a countedSuggestion into a button.

    // limit label length
    const name = author.displayName || author.username;
    let label = `(${voteCount}) ${name}: ${suggestion.text}`;
    if (label.length > 81) {
        label = label.slice(0, 77);
        label += '...';
    }

    return new MessageButton()
        .setLabel(label)
        .setStyle('SECONDARY')
        .setCustomId(suggestion.suggestionId.toString());
};
const formatVoteRow = (countedSuggestionRowChunk) => {
    // Turns an array of countedSuggestions into a MessageActionRow
    const buttons = countedSuggestionRowChunk.map(formatVoteButton);
    return new MessageActionRow().setComponents(buttons);
};
const getVoteMessage = (countedSuggestionMessageChunk) => {
    // Turns an array of countedSuggestions into a ReplyOption.
    const countedSuggestionRowChunks = chunkArray(
        countedSuggestionMessageChunk,
        5,
    );
    const components = countedSuggestionRowChunks.map(formatVoteRow);
    return {content: 'Title suggestions so far:', components};
};

module.exports.getVoteMessages = async () => {
    // Gets the current suggestions and returns an array of ReplyOptions.

    // SELECT Suggestions
    const allCountedSuggestions = await getSuggestionsWithCountedVotes();
    logger.info(
        `Found ${allCountedSuggestions.length} suggestions to vote on.`,
    );
    // SPLIT suggestions into chunks
    const countedSuggestionMessageChunks = chunkArray(
        allCountedSuggestions,
        5 * 5,
    );
    return countedSuggestionMessageChunks.map(getVoteMessage);
};
