const {getAuthorFromSuggestion, getSuggestion, countVotesOnSuggestion,
       hasVotedForSuggestion, addVoterToSuggestion, removeVoterFromSuggestion} = require("../src/sqlite.js");
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
    const suggestion = {suggestionId};
    
    // ASSOCIATE voter and suggestion in the DB
    if (await hasVotedForSuggestion(voter, suggestion)){
        console.log(`Remove vote from ${voter.username} for <${suggestion.suggestionId}>.`)
        await removeVoterFromSuggestion(voter, suggestion);
    } else {
        console.log(`Add vote from ${voter.username} for <${suggestion.suggestionId}>.`)
        await addVoterToSuggestion(voter, suggestion);
    }
    
    // DECIDE how to update the button's message
    const voteCount = await countVotesOnSuggestion(suggestion);
    const messageComponents = buttonInteraction.message.components;
    const updateOptions = updateButtonText(messageComponents, suggestionId, voteCount)
    // UPDATE the button's message
    buttonInteraction.update(updateOptions)
};

module.exports = {receiveButton}
