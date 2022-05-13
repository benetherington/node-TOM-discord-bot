try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}

const {Client, Intents, Collection} = require('discord.js');
const fs = require('fs');
const {receiveButton} = require('./title-suggestions/interactions/buttons');
const ID = require('./config/discord-id.json');

/*----*\
  INIT
\*----*/
const intents = new Intents();
intents.add(
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
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
// These are registered in ./scripts/register-commands.js, which needs to be run
// once as a provisioning step.
client.slashes = new Collection();
const interactionFileNames = fs
    .readdirSync('./title-suggestions/slash')
    .filter((fn) => fn.endsWith('.js'));
for (const fileName of interactionFileNames) {
    let slash = require('./title-suggestions/slash' + fileName);
    client.slashes.set(slash.data.name, slash);
}
const receiveSlash = async (interaction) => {
    let slash = client.slashes.get(interaction.commandName);
    if (!slash) {
        return;
    }

    slash.execute(interaction).catch((error) => {
        console.error(error);
        interaction.reply(responses.failure);
    });
};

/*---------------*\
  EVENT LISTENERS
\*---------------*/
client.once('ready', () => {
    console.log('Ready!');
});
client.on('invalidated', () => {
    console.log('Session invalidated.');
});
client.on('interactionCreate', (interaction) => {
    if (interaction.isCommand()) {
        receiveSlash(interaction);
    } else if (interaction.isButton()) {
        receiveButton(interaction);
    }
});

client.login(process.env.DISCORD_TOKEN);

module.exports = {client};
