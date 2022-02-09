const path = require("path")
const {getSuggestionsWithCountedVotes} = require("./sqlite.js");



async function doRoutes (fastify, app) {
    fastify.register(require('fastify-static'), {
        root: path.join(__dirname, 'views/icons'),
        prefix: '/icons/',
        wildcard: true
    })
    
    fastify.register(require("point-of-view"),{
        engine: {pug: require("pug")}
    })
    
    
    fastify.get("/", async (req, res)=>{
        res.view("src/views/monitor")
    })
    
    fastify.get("/api/titles/:epNum", async (request, reply)=>{
        const epNum = request.params.epNum;
        const countedSuggestions = await getSuggestionsWithCountedVotes({epNum});
        if (!countedSuggestions) throw new Error("invalid");
        return countedSuggestions;
    })
}

module.exports = {doRoutes}
