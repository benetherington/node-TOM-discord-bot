const {MessageActionRow, MessageButton} = require('discord.js');
const {
    countVotesOnSuggestion,
    toggleVoter,
} = require('../../database/suggestions');
const {
    createAuthorFromInteraction,
} = require('../slash/utilities/title-utilities');

// DISCORD COMPONENTS
const replicateOrUpdateButton = (button, searchId, newCount) => {
    // EXTRACT values
    let label = button.label;
    const customId = button.custom_id;
    const style = button.style;

    // UPDATE label
    if (button.custom_id === searchId) {
        label = button.label.replace(/\(\d*\)/, `(${newCount})`);
    }

    // CREATE new button
    return new MessageButton({label, customId, style});
};
const updateButtonInMesssage = (originalMessage, searchId, newCount) => {
    // "Bind" the custom_id and count to replicateOrUpdateButton
    const buttonProcessor = (button) =>
        replicateOrUpdateButton(button, searchId, newCount);
    // Create new MessageActionRows, one of which has an updated button
    return originalMessage.components.map((row) =>
        new MessageActionRow().addComponents(
            row.components.map(buttonProcessor),
        ),
    );
};

// DATABASE
const toggleVote = async (voter, suggestion, logger = console) => {
    const addedVote = await toggleVoter(voter, suggestion);
    if (addedVote) {
        logger.info(
            `Add vote from ${voter.username} for <${suggestion.suggestionId}>.`,
        );
    } else {
        logger.info(
            `Remove vote from ${voter.username} for <${suggestion.suggestionId}>.`,
        );
    }
};

// EVENT CALLBACK
module.exports.receiveButton = async (buttonInteraction) => {
    // BUILD a Voter (ie an Author) and Suggestion
    const voter = createAuthorFromInteraction(buttonInteraction);
    const suggestion = {
        suggestionId: buttonInteraction.customId,
    };

    // ASSOCIATE voter and suggestion in the DB
    await toggleVote(voter, suggestion, buttonInteraction.client.logger);

    // Prepare to update the button's message
    const voteCount = await countVotesOnSuggestion(suggestion);
    const updatedComponents = updateButtonInMesssage(
        buttonInteraction.message,
        suggestion.suggestionId,
        voteCount,
    );
    // UPDATE the button's message
    buttonInteraction.update({components: updatedComponents});
};
