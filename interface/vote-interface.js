const {client} = require("../bot.js")
const {getVoteMessages} = require("../slash/utilities/vote-utilities.js");
const ID = require("../src/id.json");


const startNewVoteFromApi = async ()=>{
    console.log("Bot monitor GUI requested vote message")
    const voteMessages = await getVoteMessages();
    const firstMessage = groundControl.send(voteMessages.shift())
    while (voteMessages.length) await firstMessage.reply(voteMessages.shift())
};

module.exports = {startNewVoteFromApi};
