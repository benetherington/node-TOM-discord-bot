const { Client, Intents, Collection } = require('discord.js');
const { emoji, responses } = require("./src/interaction-config.json")
const fs = require("fs");

/*
CONFIGURE
*/
const intents = new Intents()
intents.add(
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS
)
const client = new Client({intents});

client.slashes = new Collection();
const interactionFileNames = fs.readdirSync("./slash").filter(fn=>fn.endsWith(".js"));
for (const fileName of interactionFileNames) {
    let slash = require("./slash/"+fileName);
    client.slashes.set(slash.data.name, slash)
}
const {receiveButton} = require("./interactions/buttons.js");

/*
EVENTS
*/
client.once('ready', ()=>{
    console.log('Ready!');
});
client.on('invalidated', ()=>{
    console.log("Session invalidated.")
})

/*
INTERACTIONS
These are registered in ./register-commands.js, which needs to be run once
as a provisioning step.
*/
client.on("interactionCreate", async interaction=>{
    if (interaction.isCommand()) {
        let slash = client.slashes.get(interaction.commandName);
        if (!slash) {return;}
        
        try {
            await slash.execute(interaction)
        } catch (error) {
            console.error(error)
            interaction.reply(responses.failure)
        }
    } else if (interaction.isButton()) {
        receiveButton(interaction)
    }
})

client.login(process.env.DISCORD_TOKEN)
