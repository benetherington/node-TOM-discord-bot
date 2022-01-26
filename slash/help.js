const {SlashCommandBuilder} = require('@discordjs/builders');
const {emoji, responses} = require("../src/interaction-config.json")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Help and info'),
    async execute(interaction) {
        // TODO: complete help string
        interaction.reply({
            content: "Hey there! I'm Jukebox. I got this name when Ben thought it "+
            "would be cool to play music cues during live recordings. Right now, "+
            "I'm a bit limited. I mostly collect episode name suggestions, which "+
            "Ben thinks is a pretty fun audience interaction. I let everyone know "+
            "I haven't crashed yet by reacting to commands with a "+
            `${emoji.botAck}.\n\n`,
            ephemeral: true
        })
    }
}




//   controller.hears(["help", "hi", "hello", "halp"], ["direct_mention", "mention"], helpHandler)
//   controller.hears(['/help', '/jukebox', '/bot', '/helpme', '/help_me', '/halp'], "ambient", helpHandler)

  
  // SUGGESTIONS
//   controller.hears(new RegExp(/\/title (?<suggestion>.*)/), "ambient", (bot, message)=>{
//     let authorNick = message.author.nick;
//     let authorName = message.author.name;
//     let authorId   = message.author.id;
//     let jumpUrl    = message.url;
//     let messsageId = message.id;
//     let suggestion = message.match.groups.suggestion;
//     require("db")({authorNick, authorName, authorId, jumpUrl, messsageId, suggestion})
    // shouldn't it be something like
    // db.addNewSuggestion(episode, authorNick, suggestion);
    // I don't know how to identify the episode ID though. Maybe addNewSuggestion should always use the latest.
//   })
  
  
  // end module.exports
// };
