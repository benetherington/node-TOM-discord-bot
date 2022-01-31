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

const rest = new REST({version: '9'}).setToken(process.env.DISCORD_TOKEN);

console.log("Deleting all registered slash commands...")
rest.get(Routes.applicationGuildCommands(ID.user.bot, ID.guild.tomCast))
    .then(slashes=>slashes.forEach(slash=>{
        rest.delete(Routes.applicationGuildCommand(ID.user.bot, ID.guild.tomCast, slash.id))
            .then(()=>console.log(slash.name + " deleted..."))
            .catch(error=>{console.error(slash.name + " deletion failed!"); console.error(error)})
    }))
    .then(()=>console.log("Application command deletions complete"))
    .catch(console.error)
