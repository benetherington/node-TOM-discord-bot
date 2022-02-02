const {addVoter} = require("./src/sqlite.js");

const recieveButton = interaction=>{
    const token = interaction.customId;
    const voteTotal = addVoter({messageId:token});
    
};

