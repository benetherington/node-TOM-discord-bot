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
const path = require('path');
const {REST} = require('@discordjs/rest');
const {Routes} = require('discord-api-types/v9');
const ID = require('../config/discord-id.json');

// Gather all slash files to register
const slashes = [];

// Title suggestions
const suggestionFolder = './title-suggestions/slash/';
const suggestionFileNames = fs
    .readdirSync(suggestionFolder)
    .filter((fn) => fn.endsWith('.js'));
for (const fileName of suggestionFileNames) {
    const filePath = path.resolve(suggestionFolder, fileName);
    const slashData = require(filePath).data;
    slashes.push(slashData);
}
// TWSF
const twsfFolder = './twsf/discord/slash/';
const twsfFileNames = fs
    .readdirSync(twsfFolder)
    .filter((fn) => fn.endsWith('.js'));
for (const fileName of twsfFileNames) {
    const filePath = path.resolve(twsfFolder, fileName);
    const slashData = require(filePath).data;
    slashes.push(slashData);
}
// Stats
const statsFolder = './stats/slash/';
const statsFileNames = fs
    .readdirSync(statsFolder)
    .filter((fn) => fn.endsWith('.js'));
for (const fileName of statsFileNames) {
    const filePath = path.resolve(statsFolder, fileName);
    const slashData = require(filePath).data;
    slashes.push(slashData);
}

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
        console.log('Guild command registration successful.');
        console.log(
            "Don't forget to update permissions! Server Settngs>integrations>manage",
        );
    } catch (error) {
        console.error('Something went wrong in provisionSlashes');
        console.error(error);
    }
};

provisionSlashes(slashes);
