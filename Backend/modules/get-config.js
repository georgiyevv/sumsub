const fs = require("fs");

const config = JSON.parse(fs.readFileSync("./data/config.json", "utf-8"));

module.exports = config;