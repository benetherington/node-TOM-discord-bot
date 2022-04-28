const {SlashCommandBuilder} = require('@discordjs/builders');
const {emoji, responses} = require('../src/interaction-config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Help and info'),
    async execute(interaction) {
        // TODO: complete help string
        interaction.reply({
            content:
                `Hey there! I'm Jukebox. I got this name when Ben thought it ` +
                `would be cool to play music cues during live recordings. Right now, ` +
                `I'm a bit limited. I mostly collect episode name suggestions, which ` +
                `Ben thinks is a pretty fun audience interaction. I let everyone know ` +
                `I haven't crashed yet by reacting to commands with a ` +
                `${emoji.botAck}.\n\n`,
            ephemeral: true,
        });
    },
};
