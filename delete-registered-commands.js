/*
Script to de-register commands with Discord.
*/
try {require('dotenv').config()}
catch (ReferenceError) {console.log("oh hey we must be running on Glitch")}
const {REST} = require("@discordjs/rest");
const {Routes} = require("discord-api-types/v9");
const ID = require("./src/id.json");

const rest = new REST({version: '9'}).setToken(process.env.DISCORD_TOKEN);

const getSlashes = ()=>{
    return rest.get(
        Routes.applicationGuildCommands(ID.user.bot, ID.guild.tomCast)
    );
}

const deleteSlash = async(slash)=>{
    try {
        await rest.delete(
            Routes.applicationGuildCommand(ID.user.bot, ID.guild.tomCast, slash.id)
        )
        console.log(slash.name + " deleted...")
    } catch (error) {
        console.error(slash.name + " deletion failed!")
        console.error(error)
    }
}

const deleteSlashes = async ()=>{
    const registeredSlashes = await getSlashes();
    console.log(`Deleting ${registeredSlashes.length} registered slash commands...`)
    for (slash of registeredSlashes) {
        await deleteSlash(slash)
    }
    console.log("Application command deletions complete.")
}

deleteSlashes()
