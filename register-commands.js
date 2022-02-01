/*
Script to register slash commands with Discord. This should only ever need to be
run once. "Command" rubs me the wrong way for some reason? I'm gonna use just
"slash" instead.
*/
try {require('dotenv').config()}
catch (ReferenceError) {console.log("oh hey we must be running on Glitch")}
const fs = require("fs");
const {REST} = require("@discordjs/rest");
const {Routes} = require("discord-api-types/v9");
const ID = require("./src/id.json");

// Gather all slash files to register
const slashFiles = fs.readdirSync("./slash").filter(f=>f.endsWith(".js"));
const slashes = slashFiles.map(fileName=>require("./slash/"+fileName).data);
const getSlashIdWithPermissions = registeredSlash=>{
    const permissions = slashes.find(s=>s.name===registeredSlash.name).permissions;
    const id = registeredSlash.id;
    return {id, permissions}
}

// Init our REST API object. We don't need the full Client right now.
const rest = new REST({version: '9'}).setToken(process.env.DISCORD_TOKEN);

// Register our list of slashes
rest.put(Routes.applicationGuildCommands(ID.user.bot, ID.guild.tomCast),{body: slashes})
    .then(registeredSlashes=>{
        console.log("Guild command registration successful.")
        // Gather permissions with the IDs assigned
        return registeredSlashes.map(getSlashIdWithPermissions).filter(slash=>slash.permissions);
    })
    .then(fullPermissions=>{
        // Register our new permissions
        rest.put(Routes.guildApplicationCommandsPermissions(ID.user.bot, ID.guild.tomCast), {body:fullPermissions})
    })
    .then(()=>console.log("Application command permissions edit successful"))
    .catch(console.error)

