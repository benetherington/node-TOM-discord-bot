/*
Script to register slash commands with Discord. This should only ever need to be
run once. "Command" rubs me the wrong way for some reason? I'm gonna use just
"slash" instead.
*/
try {
    require('dotenv').config();
} catch (ReferenceError) {
    console.log('oh hey we must be running on Glitch');
}
const fs = require('fs');
const {REST} = require('@discordjs/rest');
const {Routes} = require('discord-api-types/v9');
const ID = require('../config/discord-id.json');

// Gather all slash files to register
const slashFiles = fs.readdirSync("./title-suggestions/slash").filter(f=>f.endsWith(".js"));
const slashes = slashFiles.map(fileName=>require("../title-suggestions/slash/"+fileName).data);

// Init our REST API object. We don't need the full Client right now.
const rest = new REST({version: '9'}).setToken(process.env.DISCORD_TOKEN);

// Register our list of slashes
const provisionSlashes = async (slashes) => {
    try {
        // batch overwrite application commands
        await rest.put(
            Routes.applicationGuildCommands(ID.user.bot, ID.guild.tomCast),
            {
                body: slashes,
            },
        );
        console.log("Guild command registration successful.")
        console.log("Don't forget to update permissions! Server Settngs>integrations>manage")
    } catch (error) {
        console.error("Something went wrong in provisionSlashes")
        console.error(error)
    }
};

provisionSlashes(slashes);
