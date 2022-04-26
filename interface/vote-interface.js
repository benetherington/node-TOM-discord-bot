const {client} = require('../bot.js');
const {getVoteMessages} = require('../slash/utilities/vote-utilities.js');
const ID = require('../src/id.json');

const startNewVoteFromApi = async () => {
    console.log('Bot monitor GUI requested vote message');

    const channelId = process.env.TEST
        ? ID.channel.botTest
        : ID.channel.groundControl;
    const channel = await client.channels.fetch(channelId);

    const voteMessages = await getVoteMessages();
    const firstMessage = channel.send(voteMessages.shift());
    while (voteMessages.length) await firstMessage.reply(voteMessages.shift());
};

module.exports = {startNewVoteFromApi};
