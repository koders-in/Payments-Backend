const { default: Axios } = require("axios");
const data = require("./config.json");
const client = Axios.create({
  baseURL: data.redmine_url || process.env.REDMINE_URL,
});

module.exports = client;
