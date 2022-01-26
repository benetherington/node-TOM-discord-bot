/*
Script to register slash commands with Discord. This should only ever need to be
run once.
*/
try {require('dotenv').config()}
catch (ReferenceError) {console.log("oh hey we must be running on Glitch")}
const fs = require("fs");
const {REST} = require("@discordjs/rest");
const {Routes} = require("discord-api-types/v9");
const ID = require("./src/id.json")

// "Command" rubs me the wrong way for some reason? I'm gonna use "slash" instead.
const slashes = new Array;
const slashFiles = fs.readdirSync("./slash").filter(f=>f.endsWith(".js"));

for (let fileName of slashFiles) {
    let slash = require("./slash/"+fileName);
    slashes.push(slash.data.toJSON())
}

const rest = new REST({version: '9'}).setToken(process.env.DISCORD_TOKEN);

rest.put(Routes.applicationGuildCommands(ID.user.bot, ID.guild.tomCast), {body: slashes})
    .then(()=>console.log("Application command registration successful."))
    .catch(console.error)
