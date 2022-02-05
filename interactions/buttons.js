const {getAuthorFromSuggestion, getSuggestion, countVotesOnSuggestion, addVoterToSuggestion} = require("../src/sqlite.js");
const {formatTitleReply} = require("../slash/title.js");
const {formatVoteButton} = require("../slash/vote.js");
const { MessageActionRow } = require("discord.js");



const rebuildVoteComponents = (componentsToCopy, {author, suggestion, voteCount})=>{
    return componentsToCopy.map(row=>{
        const newButtons = row.components.map(button=>{
            const [_, buttonSugId] = JSON.parse(button.custom_id);
            if (buttonSugId===suggestion.suggestionId) {
                // We need to update this button
                return formatVoteButton({author, suggestion, voteCount});
            } else {
                // We need to replicate this button
                return button;
            }
        });
        return new MessageActionRow().setComponents(newButtons);
    })
}
const formatVoteUpdate = (componentsToCopy, countedSuggestion)=>{
    const components = rebuildVoteComponents(componentsToCopy, countedSuggestion)
    return {content:"Title suggestions so far:", components}
};

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
    const author = await getAuthorFromSuggestion(suggestion);
    const countedSuggestion = {author, suggestion, voteCount};
    let updateOptions;
    if (createdBySlash==="title") {
        updateOptions = formatTitleReply(countedSuggestion);
    } else if (createdBySlash==="vote") {
        const componentsToCopy = buttonInteraction.message.components;
        updateOptions = formatVoteUpdate(componentsToCopy, countedSuggestion);
    }
    // UPDATE the button's message
    buttonInteraction.update(updateOptions)
};

module.exports = {receiveButton}
