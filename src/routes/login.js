const {getAdminByCredentials, createToken} = require("../sqlite/admin.js");


module.exports = (fastify, opts, done)=>{
    
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
    
    
    done();
};