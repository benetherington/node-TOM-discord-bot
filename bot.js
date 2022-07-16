require('dotenv').config();

const {Client, Intents, Collection} = require('discord.js');
const fs = require('fs');
const path = require('path');

const ID = require('./config/discord-id.json');

/*----*\
  INIT
\*----*/
const intents = new Intents();
intents.add(
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES,
);
const client = new Client({intents});
client.logger = require('./logger');

// Status events
client.on('ready', () => {
    const respondingIn = process.env.TEST ? '#bot_control' : '#ground_control';
    client.logger.info(`Ready! GUI commands output to: ${respondingIn}.`);
});
client.on('invalidated', () => {
    client.logger.info('Session invalidated.');
});

/*-----*\
  CACHE
\*-----*/
// ensure our channels are in the cache
client.channels.fetch(ID.channel.botTest);
client.channels.fetch(ID.channel.groundControl);

/*-------*\
  SLASHES
\*-------*/
// We'll load all of our slash handlers into a collection, and store it inside
// client. These handlers are triggered by events sent to us by Discord. Before
// one of these events is triggered, we need to tell the Discord server what's
// available, which we do in ./scripts/register-commands.js. This needs to be
// run once as a provisioning step whever slashes change.
client.slashes = new Collection();
const slashDirs = [
    './title-suggestions/slash/',
    './twsf/discord/slash/',
    './stats/slash/',
];

// Assemble all the module files we'll need to require
const slashDirsAndFileNames = slashDirs.map((dir) => {
    let fileNames = fs.readdirSync(dir);
    fileNames = fileNames.filter((name) => name.endsWith('.js'));
    return [dir, fileNames];
});

// Require each module, store it in the collection
for (const [dir, fileNames] of slashDirsAndFileNames) {
    for (const fileName of fileNames) {
        const filePath = path.resolve(dir, fileName);
        const slash = require(filePath);
        client.slashes.set(slash.data.name, slash);
    }
}

/*------------*\
  INTERACTIONS
\*------------*/
// Handlers
const {receiveButton} = require('./title-suggestions/interactions/buttons');
const receiveSlash = async (interaction) => {
    let slash = client.slashes.get(interaction.commandName);
    if (!slash) return;

    slash.execute(interaction).catch((error) => {
        client.logger.error(error);
        if (interaction.isRepliable()) interaction.reply(responses.failure);
    });
};

// Listener
client.on('interactionCreate', (interaction) => {
    try {
        if (interaction.isCommand()) {
            receiveSlash(interaction);
        } else if (interaction.isButton()) {
            receiveButton(interaction);
        }
    } catch (error) {
        client.logger.error(
            'Error encountered while handling incoming interaction!',
        );
        client.logger.error(interaction);
        client.logger.error(error);
    }
});

/*------------*\
  OTHER EVENTS
\*------------*/
const {onVoiceStateUpdate} = require('./twsf/discord/event');
client.on('voiceStateUpdate', onVoiceStateUpdate);

/*------*\
  FINISH
\*------*/
// client.login(process.env.DISCORD_TOKEN);
module.exports = {client};
