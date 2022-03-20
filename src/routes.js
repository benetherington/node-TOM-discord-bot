const path = require("path")

const {getSuggestionsWithCountedVotes} = require("./sqlite.js");
const {startNewVote} = require("../interface/vote-interface.js");
const {addNewSuggestion} = require("../interface/title-interface.js");
const {getAdminByToken, getAdminByCredentials, createToken} = require("./sqlite/admin.js");
const { create } = require("domain");


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
    // STATIC ROUTES
    fastify.register(require('fastify-static'), {
        root: path.join(__dirname, 'views/icons'),
        prefix: '/icons/',
        wildcard: true
    })
    
    // ROOT
    fastify.get("/", async (request, reply)=>{
        const admin = await getAdminFromTokenOrRedirect(request, reply);
    })
    
    // LOGIN
    fastify.get("/login", async (request, reply)=>{
        reply.view("src/views/login")
    })
    fastify.post("/login", async (request, reply)=>{
        // Authenticate administrator
        const username = request.body.username;
        const password = request.body.password;
        const adminUser = await getAdminByCredentials(username, password);
        
        // Redirect if bad credentials
        if (!adminUser) reply.redirect("/login?auth=failed")
        
        // Send an authentication token
        const token = await createToken(adminUser);
        reply.setCookie("auth", token)
        
        // Redirect to root
        reply.redirect("/")
    })
    
    // API
    // view suggestions
    fastify.get("/api/titles/:epNum", async (request, reply)=>{
        getAdminFromTokenOrRedirect(request, reply);
        
        const epNum = request.params.epNum;
        const countedSuggestions = await getSuggestionsWithCountedVotes({epNum});
        if (!countedSuggestions) throw new Error("invalid");
        return countedSuggestions;
    })
    
    // edit suggestions
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
