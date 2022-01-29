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
let slashes = new Array();
let permissions = new Object();

// Require registration info
for (let fileName of slashFiles) {
    let {data, permission} = require("./slash/"+fileName);
    let jsn = data.toJSON();
    slashes.push(jsn)
    permissions[jsn.name] = permission;
}
// slashes is now an array full of JSON-ized SlashCommandBuilders.
// permissions is now a name-keyed array of ApplicationCommandPermission-like objects

// Init our REST API object. We don't need the full Client right now.
const rest = new REST({version: '9'}).setToken(process.env.DISCORD_TOKEN);

// Register our list of slashes
rest.put(Routes.applicationGuildCommands(ID.user.bot, ID.guild.tomCast),{body: slashes})
    .then(registeredSlashes=>{
        console.log("Guild command registration successful.")
        // Gather permissions with the IDs assigned
        return registeredSlashes
            .map(rSlash=>{
                // fetch permissions object
                let permission = permissions[rSlash.name];
                if (!permission) return;
                // make it an array if needed
                let permissionArray = permission instanceof Array ? permission : [permission];
                // hand back the ID and permissions array
                return {id: rSlash.id,
                        permissions: permissionArray}
            })
            .filter(p=>p);
    })
    .then(fullPermissions=>{
        // Register our new permissions
        rest.put(Routes.guildApplicationCommandsPermissions(ID.user.bot, ID.guild.tomCast), {body:fullPermissions})
    })
    .then(()=>console.log("Application command permissions edit successful"))
    .catch(console.error)
