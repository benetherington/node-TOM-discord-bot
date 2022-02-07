const { MessageActionRow, MessageButton } = require("discord.js");
const {countVotesOnSuggestion, hasVotedForSuggestion,
       addVoterToSuggestion, removeVoterFromSuggestion} = require("../src/sqlite.js");



const replicateOrUpdateButton = (button, searchId, newCount)=>{
    let newLabel = button.label;
    if (button.custom_id===searchId) {
        newLabel = button.label.replace(/\(\d*\)/, `(${newCount})`);
    }
    return new MessageButton()
        .setLabel(newLabel)
        .setCustomId(button.custom_id)
        .setStyle(button.style);
}
const updateButtonInMesssage = (originalMessage, searchId, newCount)=>{
    const buttonProcessor = (button)=>replicateOrUpdateButton(button, searchId, newCount);
    return originalMessage.components.map(row=>
        new MessageActionRow().addComponents(row.components.map(buttonProcessor))
    );
}

const receiveButton = async buttonInteraction=>{
    // BUILD a Voter (ie an Author) and Suggestion
    const voter = {
        discordId: buttonInteraction.user.id,
        username: buttonInteraction.user.username,
        displayName: buttonInteraction.member.displayName
    };
    const suggestion = {
        suggestionId: buttonInteraction.customId
    };
    
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
    const updatedComponents = updateButtonInMesssage(buttonInteraction.message, suggestion.suggestionId, voteCount);
    // UPDATE the button's message
    buttonInteraction.update({components: updatedComponents})
};

module.exports = {receiveButton}
