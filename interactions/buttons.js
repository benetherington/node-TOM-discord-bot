const { MessageActionRow, MessageButton } = require("discord.js");
const {countVotesOnSuggestion, hasVotedForSuggestion,
       addVoterToSuggestion, removeVoterFromSuggestion} = require("../src/sqlite.js");


// DISCORD COMPONENTS
const replicateOrUpdateButton = (button, searchId, newCount)=>{
    // EXTRACT values
    let label = button.label;
    const customId = button.custom_id;
    const style = button.style;
    
    // UPDATE label
    if (button.custom_id===searchId) {
        label = button.label.replace(/\(\d*\)/, `(${newCount})`);
    }
    
    // CREATE new button
    return new MessageButton({label, customId, style})
}
const updateButtonInMesssage = (originalMessage, searchId, newCount)=>{
    const buttonProcessor = (button)=>replicateOrUpdateButton(button, searchId, newCount);
    return originalMessage.components.map(row=>
        new MessageActionRow().addComponents(row.components.map(buttonProcessor))
    );
}

// DATABASE
const toggleVote = async (voter, suggestion)=>{
    if (await hasVotedForSuggestion(voter, suggestion)){
        console.log(`Remove vote from ${voter.username} for <${suggestion.suggestionId}>.`)
        await removeVoterFromSuggestion(voter, suggestion);
    } else {
        console.log(`Add vote from ${voter.username} for <${suggestion.suggestionId}>.`)
        await addVoterToSuggestion(voter, suggestion);
    }
}


// EVENT CALLBACK
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
    await toggleVote(voter, suggestion);
    
    // DECIDE how to update the button's message
    const voteCount = await countVotesOnSuggestion(suggestion);
    const updatedComponents = updateButtonInMesssage(buttonInteraction.message, suggestion.suggestionId, voteCount);
    // UPDATE the button's message
    buttonInteraction.update({components: updatedComponents})
};

module.exports = {receiveButton}
