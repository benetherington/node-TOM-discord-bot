// server.js
// where your node app starts

// init project
const express = require("express");
const fs = require("fs");
const discordBotkit = require("botkit-discord");
// var Client = require("uptime-robot");
const router = express.Router();
const path = require('path');
const app = express();

const discordBot = require("./bot");

// // this is the code for the guides
// app.use(require('./guides'));

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

app.get(['/'], (request, response) => {
  response.sendFile(path.join(__dirname+'/index.html'))
})


const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
