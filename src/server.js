const path = require("path");

/*---*\
  BOT
\*---*/
require("../bot.js")


/*------*\
  SERVER
\*------*/
// Import fastify
const fastify = require("fastify")({
    logger: {level: "debug"}
});

// Renderer
fastify.register(require("point-of-view"),{
    engine: {pug: require("pug")}
})

// Cookies
fastify.register(require('fastify-cookie'), {
    secret: process.env.COOKIE_SECRET
})

// Routes
fastify.register(require('fastify-formbody'))
fastify.register(require("./routes/static.js"))
fastify.register(require("./routes/login.js"))
fastify.register(require("./routes/monitor.js"))

// Start server
fastify.listen(3000, (err, address)=>{
    if (err) {
        console.error(err)
        process.exit(1)
    }
})
