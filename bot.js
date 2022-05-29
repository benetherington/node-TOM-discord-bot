try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}

const {Client, Intents, Collection} = require('discord.js');
const fs = require('fs');
const path = require('path');

const {receiveButton} = require('./title-suggestions/interactions/buttons');
const {onVoiceStateUpdate} = require("./twsf/discord/event");
const ID = require('./config/discord-id.json');

/*----*\
  INIT
\*----*/
const intents = new Intents();
intents.add(
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES,
);
const client = new Client({intents});

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

// Title suggestions
const suggestionFolder = './title-suggestions/slash/';
const suggestionFileNames = fs
    .readdirSync(suggestionFolder)
    .filter((fn) => fn.endsWith('.js'));
for (const fileName of suggestionFileNames) {
    const filePath = path.resolve(suggestionFolder, fileName);
    let slash = require(filePath);
    client.slashes.set(slash.data.name, slash);
}

// TWSF
const twsfFolder = './twsf/discord/slash/';
const twsfFileNames = fs
    .readdirSync(twsfFolder)
    .filter((fn) => fn.endsWith('.js'));
for (const fileName of twsfFileNames) {
    const filePath = path.resolve(twsfFolder, fileName);
    let slash = require(filePath);
    client.slashes.set(slash.data.name, slash);
}

/*---------------*\
  EVENT LISTENERS
\*---------------*/
client.once('ready', () => {
    const respondingIn = process.env.TEST ? '#bot_control' : '#ground_control';
    console.log(`Ready! GUI commands output to: ${respondingIn}.`);
});
client.on('invalidated', () => {
    console.log('Session invalidated.');
});

const receiveSlash = async (interaction) => {
    let slash = client.slashes.get(interaction.commandName);
    if (!slash) return;

    slash.execute(interaction).catch((error) => {
        console.error(error);
        interaction.reply(responses.failure);
    });
};
client.on('interactionCreate', (interaction) => {
    try {
        if (interaction.isCommand()) {
            receiveSlash(interaction);
        } else if (interaction.isButton()) {
            receiveButton(interaction);
        }
    } catch (error) {
        console.error('Error encountered while handling incoming interaction!');
        console.error(interaction);
        console.error(error);
    }
});
client.on("voiceStateUpdate", onVoiceStateUpdate);

client.login(process.env.DISCORD_TOKEN);

module.exports = {client};
