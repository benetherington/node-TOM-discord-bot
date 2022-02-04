const {countVotesOnSuggestion, addVoterToSuggestion, getSuggestion} = require("../src/sqlite.js");
const {formatTitleReply} = require("../slash/title.js")

const receiveButton = async interaction=>{
    const voter = {
        discordId: interaction.user.id,
    };
    const suggestion = {
        suggestionId: interaction.customId
    }
    
    await addVoterToSuggestion(voter, suggestion);
    const voteCount = await countVotesOnSuggestion(suggestion);
    const {text} = await getSuggestion(suggestion);
    suggestion.text = text
    
    interaction.update(formatTitleReply(voter, suggestion, voteCount))
};

module.exports = {receiveButton}
