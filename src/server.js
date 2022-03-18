const path = require("path");

/*---*\
  BOT
\*---*/
require("../bot.js")


/*------*\
  SERVER
\*------*/
// IMPORT fastify
const fastify = require("fastify")({
    logger: true
});
// const fastifyStatic = require("fastify-static");

// INIT fastify
const {doRoutes} = require("./routes.js")
doRoutes(fastify);

// START server
fastify.listen(3000, (err, address)=>{
    if (err) {
        console.error(err)
        process.exit(1)
    }
})
