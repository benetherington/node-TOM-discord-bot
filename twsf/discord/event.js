const {channel, role} = require('../../config/discord-id.json');

const isTheShow = (state) => state.channelId === channel.theShow;
const getName = (member) => member.nickname || member.displayName;

var chatThankYous = [];

module.exports.onVoiceStateUpdate = async (oldState, newState) => {
    // Check if this is someone joining or leaving
    const joiningTheShow = isTheShow(newState);
    if (!joiningTheShow) return;

    // Fetch member, check that they're a listener
    const member = newState.member;
    if (member._roles.includes(role.tomCrew)) return;

    // Add their name to the list
    const name = getName(member);
    if (!chatThankYous.includes(name)) chatThankYous.push(name);
};

module.exports.getChatThankYous = () => chatThankYous;
module.exports.clearChatThankYous = () => (chatThankYous = []);
