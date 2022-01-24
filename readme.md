# Grittybot for Discord

## Prereqs
This bot was remixed from [Discord Botkit Starter](https://starter-botkit-discord.glitch.me)

Follow those instructions to ensure you have the following:
      
* A Discord token
* Server access to the Discord instance you're adding Gritty to.
* An Uptime Robot Key.
* To use the gif functionality, you'll also need: (A GIPHY API key)[https://giphy-starter-app.glitch.me/].

## Configure

1. Remix this app
2. Open the source code, and find the .env file  
3. Paste your Discord, Uptime Robot, and Giphy keys in the appropiate place  
4. Go to skills/hears.js and start adding your own functionality!

## Commands
`@grittybot funfact`
Tells you something interesting about Gritty's interests or life

`@grittybot selfie`
Shows you a fierce Gritty gif (Requries GIPHY API key)

`@grittybot thank @USERNAME`
Gritty will give kudos to another Discord member

`@grittybot find-gif SEARCHTEAM`
Gritty will find an awesome gif for you based on a search term (Requries GIPHY API key)

`@grittybot funfact`
Tells you something interesting about Gritty's hobbies or life.

`@grittybot roster`
Tells you this years Flyers roster

`@grittybot stat`
Tells you the Flyers current stats

`@grittybot help`
Shows you all of Gritty's available commands

*****

## The Code
### assets

This is where you [can add images, sound files, and other media](https://glitch.com/help/how-do-i/).

### public/style.css

This is the styling for the install guide

### skills/hears.js

This is an [Botkit](https://botkit.ai/) skill for your bot allowing it to respond to certain words it "hears" on the server. Head

### .env

This is a file for storing secure info like API keys

### .gitignore

Git is a "version control" system, which is a fancy way of saying it backs up a record of all your code. This file tells git not to back up certain files. For example `.env` we don't want it backing up because it contains secure info.

### bot.js

This is the base code initializing the bot by giving it to the Discord Api key and telling it where the skills files are

### package.json

This is a file that contains info about your project, like what [node modules it should install](https://glitch.com/help/how-do-i-add-an-npm-module-package-to-my-project/)

### readme.md

This is this file! It's full of helpful info.

### server.js

This contains the code that connects all the different pieces of the bot together so it can be started by package.json

*****


## Relevant links
* [Discord Tutorials](https://discord-tutorials.glitch.me/)
* [Discord Botkit Starter](https://starter-botkit-discord.glitch.me)
* [GIPHY Starter App](https://giphy-starter-app.glitch.me/)
* [DiscordJS Docs](https://discordjs.guide/creating-your-bot/)