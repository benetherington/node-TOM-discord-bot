const {client} = require("../bot.js")
const {getVoteMessages} = require("../slash/utilities/vote-utilities.js");
const ID = require("../src/id.json");


const startNewVote = async ()=>{
    console.log("Bot monitor GUI requested vote message")
    const voteMessages = await getVoteMessages();
    const groundControl = await client.channels.fetch(ID.channel.botTest)
    const firstMessage = groundControl.send(voteMessages.shift())
    while (voteMessages.length) await firstMessage.reply(voteMessages.shift())
};

module.exports = {startNewVote};
