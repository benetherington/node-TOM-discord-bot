// const GphApiClient = require("giphy-js-sdk-core");
// const giphy = GphApiClient(process.env.GIPHY_KEY);


// We use a module for handling database operations in /src
const data = require("../src/data.json");
const db = require("../src/" + data.database);

// some helpful things
const request = require("request");
const apiLimit = 5;

const botAckEmoji = '🤖';
const deniedEmoji = "👎😅🚨🔒🛑❌💔🚫";
const voteEmojis = [
    '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚪',
    '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬜',
    '🔻', '🔶',              '🔷',
    '❤️', '🧡',       '💚', '💙', '💜', '🤎', '🤍',
    '⬇', '➡️', '⬅️', '↖️', '↗️', '↘️', '↙️',
];


module.exports = function (controller) {
  // HELP
  let helpHandler = async(bot, message)=>{
      message.user.createDM().then(dm=>{dm.send(
        "Hey there! I'm Jukebox. I got this name when Ben thought it "+
        "would be cool to play music cues during live recordings. Right now, "+
        "I'm a bit limited. I mostly collect episode name suggestions, which "+
        "Ben thinks is a pretty fun audience interaction. I let everyone know "+
        "I haven't crashed yet by reacting to commands with a "+
        `${botAckEmoji}.\n\n`
      )})
      // TODO: complete help string
      message.react(botAckEmoji)
  };
  controller.hears(["help", "hi", "hello", "halp"], ["direct_mention", "mention"], helpHandler)
  controller.hears(['/help', '/jukebox', '/bot', '/helpme', '/help_me', '/halp'], "ambient", helpHandler)

  
  // SUGGESTIONS
  controller.hears(new RegExp(/\/title (?<suggestion>.*)/), "ambient", (bot, message)=>{
    let authorNick = message.author.nick;
    let authorName = message.author.name;
    let authorId   = message.author.id;
    let jumpUrl    = message.url;
    let messsageId = message.id;
    let suggestion = message.match.groups.suggestion;
    require("db")({authorNick, authorName, authorId, jumpUrl, messsageId, suggestion})
    // shouldn't it be something like
    // db.addNewSuggestion(episode, authorNick, suggestion);
    // I don't know how to identify the episode ID though. Maybe addNewSuggestion should always use the latest.
  })
  
  
  // end module.exports
};
