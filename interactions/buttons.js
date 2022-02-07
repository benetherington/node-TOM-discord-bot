const {getAuthorFromSuggestion, getSuggestion, countVotesOnSuggestion, addVoterToSuggestion} = require("../src/sqlite.js");
const {formatTitleReply} = require("../slash/title.js");
const {formatVoteButton} = require("../slash/vote.js");
const { MessageActionRow } = require("discord.js");



const updateButtonText = (messageComponents, suggestionId, voteCount)=>{
    return messageComponents.map(row=>{
        const components = row.components.map(button=>{
            const [_, buttonId] = JSON.parse(button.custom_id);
            if (buttonId===suggestionId) {
                button.label = button.label.replace(/\(\d*\)/, `(${voteCount})`);
            }
            return button;
        });
        return {components, type:row.type}
    })
}

const receiveButton = async buttonInteraction=>{
    // BUILD an "Author"
    const voter = {
        discordId: buttonInteraction.user.id,
        username: buttonInteraction.user.username,
        displayName: buttonInteraction.member.displayName
    };
    // BUILD a Suggestion
    const [createdBySlash, suggestionId] = JSON.parse(buttonInteraction.customId);
    const suggestion = await getSuggestion({suggestionId});
    
    // ASSOCIATE voter and suggestion in the DB
    console.log(`New vote from ${voter.username} for <${suggestion.text}>.`)
    await addVoterToSuggestion(voter, suggestion);
    
    // DECIDE how to update the button's message
    const voteCount = await countVotesOnSuggestion(suggestion);
    const messageComponents = buttonInteraction.message.components;
    const updateOptions = updateButtonText(messageComponents, suggestionId, voteCount)
    // UPDATE the button's message
    buttonInteraction.update(updateOptions)
};

module.exports = {receiveButton}
