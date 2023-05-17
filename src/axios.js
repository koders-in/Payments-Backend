const { default: Axios } = require('axios')

const client = Axios.create({
  baseURL: process.env.REDMINE_URL
})

module.exports = client
