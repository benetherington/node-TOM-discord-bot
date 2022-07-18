require("dotenv").config();
const pino = require("pino");
const pretty = require("pino-pretty");

// Log to console in development, log to file in production
let destination;
if (process.env.NODE_ENV === "development") {
  destination = pretty({
    colorize: true,
  });
} else {
  destination = pino.destination(`${process.cwd()}/app.log`);
}

module.exports = pino({ level: "info" }, destination);
