const {getAdminByToken} = require("../sqlite/admin.js")

module.exports.getAdminFromTokenOrRedirect = async (request, reply)=>{
    // Token must exist
    if (!request.cookies.auth)
    {reply.redirect("/login?auth=none");}
    
    // Token must be valid
    const admin = await getAdminByToken(request.cookies.auth);
    if (!admin) reply.redirect("/login?auth=none");
    else return admin;
};
