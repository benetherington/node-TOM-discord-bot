const { Client, Intents, Collection } = require('discord.js');
const { emoji, responses } = require("./src/interaction-config.json")
const fs = require("fs");
const {receiveButton} = require("./interactions/buttons.js");

/*----*\
  INIT
\*----*/
const intents = new Intents()
intents.add(
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS
)
const client = new Client({intents});

/*-------*\
  SLASHES
\*-------*/
// These are registered in ./register-commands.js, which needs to be run once as
// a provisioning step.
client.slashes = new Collection();
const interactionFileNames = fs.readdirSync("./slash").filter(fn=>fn.endsWith(".js"));
for (const fileName of interactionFileNames) {
    let slash = require("./slash/"+fileName);
    client.slashes.set(slash.data.name, slash)
}
const receiveSlash = async interaction=>{
    let slash = client.slashes.get(interaction.commandName);
    if (!slash) {return;}
    
    slash.execute(interaction).catch(error) {
        console.error(error)
        interaction.reply(responses.failure)
    }
}

/*---------------*\
  EVENT LISTENERS
\*---------------*/
client.once('ready', ()=>{
    console.log('Ready!');
});
client.on('invalidated', ()=>{
    console.log("Session invalidated.")
})
client.on("interactionCreate", interaction=>{
    if (interaction.isCommand()) {
        receiveSlash(interaction)
    } else if (interaction.isButton()) {
        receiveButton(interaction)
    }
})

client.login(process.env.DISCORD_TOKEN)
