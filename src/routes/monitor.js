const {getSuggestionsWithCountedVotes} = require("../sqlite.js");
const {startNewVote} = require("../../interface/vote-interface.js");
const {addNewSuggestion} = require("../../interface/title-interface.js");
const {getAdminByToken, getAdminByCredentials, createToken} = require("../sqlite/admin.js");


const getAdminFromTokenOrRedirect = async (request, reply)=>{
    // Token must exist
    if (!request.cookies.auth)
    {reply.redirect("/login?auth=none");}
    
    // Token must be valid
    const admin = await getAdminByToken(request.cookies.auth);
    if (!admin) reply.redirect("/login?auth=none");
    else return admin;
};


module.exports = (fastify, opts, done)=>{
    
    // Suggestion monitor
    fastify.get("/", async (request, reply)=>{
        const admin = await getAdminFromTokenOrRedirect(request, reply);
        reply.view("src/views/monitor", {username: admin.username})
    })
    
    
    // XML: get suggestions
    fastify.get("/api/titles/:epNum", async (request, reply)=>{
        getAdminFromTokenOrRedirect(request, reply);
        
        const epNum = request.params.epNum;
        const countedSuggestions = await getSuggestionsWithCountedVotes({epNum});
        if (!countedSuggestions) throw new Error("invalid");
        return countedSuggestions;
    })
    
    
    // XML: edit suggestions
    fastify.post("/api/titles/:messageId", (request, reply)=>{
        getAdminFromTokenOrRedirect(request, reply);
        
        const messageId = request.params.messageId;
        addNewSuggestionFromApi(messageId)
    })
    fastify.post("/api/vote", (request, reply)=>{
        getAdminFromTokenOrRedirect(request, reply);
        
        startNewVoteFromApi();
    })
    
    
    done()
};
