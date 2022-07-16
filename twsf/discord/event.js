const {channel, role} = require('../../config/discord-id.json');
const {updateAuthorThank} = require('../../database/thankyou');

const authorFromVoiceState = (state) => {
    const discordId = state.id;
    const username = state.member.user.username;
    const displayName = state.member.displayName || '';
    const callsign = state.member.nickname || displayName || username;
    return {
        discordId,
        username,
        displayName,
        callsign,
    };
};

module.exports.onVoiceStateUpdate = async (oldState, newState) => {
    // Check if this is someone joining or leaving
    const joiningTheShow = newState.channelId === channel.theShow;
    if (!joiningTheShow) return;

    // Fetch member, check that they're not one of the crew
    const isTomCrew = newState.member._roles.includes(role.tomCrew);
    newState.client.logger.info({msg: "New connection to The Show", isTomCrew})
    if (isTomCrew) return;

    // Add their name to the list
    const author = authorFromVoiceState(newState);
    updateAuthorThank(author);
};
