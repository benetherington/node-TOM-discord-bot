const {client} = require('../../bot');
const {getVoteMessages} = require('../slash/utilities/vote-utilities');
const ID = require('../../config/discord-id.json');

module.exports.startNewVoteFromApi = async () => {
    client.logger.info('Bot monitor GUI requested vote message');

    const inDevEnv = process.env.NODE_ENV === 'development';
    const channelId = inDevEnv ? ID.channel.botTest : ID.channel.groundControl;
    const channel = await client.channels.fetch(channelId);

    const voteMessages = await getVoteMessages();
    const firstMessage = channel.send(voteMessages.shift());
    while (voteMessages.length) await firstMessage.reply(voteMessages.shift());
};
