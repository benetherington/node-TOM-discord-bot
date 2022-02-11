const path = require("path")
const {getSuggestionsWithCountedVotes} = require("./sqlite.js");
const {startNewVote} = require("../interface/vote-interface.js");
const {addNewSuggestion} = require("../interface/title-interface.js");


async function doRoutes (fastify, app) {
    // RENDERING
    fastify.register(require("point-of-view"),{
        engine: {pug: require("pug")}
    })
    
    // STATIC
    fastify.register(require('fastify-static'), {
        root: path.join(__dirname, 'views/icons'),
        prefix: '/icons/',
        wildcard: true
    })
    
    // DYNAMIC
    fastify.get("/", async (req, res)=>{
        res.view("src/views/monitor")
    })
    fastify.get("/api/titles/:epNum", async (request, reply)=>{
        const epNum = request.params.epNum;
        const countedSuggestions = await getSuggestionsWithCountedVotes({epNum});
        if (!countedSuggestions) throw new Error("invalid");
        return countedSuggestions;
    })
    fastify.post("/api/titles/:messageId", (request, reply)=>{
        const messageId = request.params.messageId;
        addNewSuggestionFromApi(messageId)
    })
    fastify.post("/api/vote", (request, reply)=>{
        startNewVoteFromApi();
    })
}

module.exports = {doRoutes}
