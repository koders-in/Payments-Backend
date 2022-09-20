const { default: Axios } = require("axios");

const client = Axios.create({
  baseURL: process.env.REDMINE_URL,
});

const makeHeader = (apiKey, isUserAgent = false) => {
  if (!isUserAgent) {
    return { headers: { "X-Redmine-API-Key": apiKey } };
  } else {
    return {
      headers: {
        "X-Redmine-API-Key": apiKey,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Safari/537.36 OPR/90.0.4480.78 (Edition std-1)",
      },
    };
  }
};

module.exports = { client, makeHeader };
