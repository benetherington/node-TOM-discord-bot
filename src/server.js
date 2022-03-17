// Glitch handles its own env
try {require('dotenv').config()}
catch (ReferenceError) {console.log("oh hey we must be running on Glitch")}
const path = require("path");

// init bot
require("../bot.js")

// web server
const fastify = require("fastify")({
    logger: true
});
// const fastifyStatic = require("fastify-static");
const {doRoutes} = require("./routes.js")
doRoutes(fastify);


fastify.listen(3000, (err, address)=>{
    if (err) {
        console.error(err)
        process.exit(1)
    }
})
