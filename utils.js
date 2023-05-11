const client = require('./axios')

require('dotenv').config()

const makeConfig = (apiKey, isUA = false) => {
  if (!isUA) {
    return {
      headers: { 'X-Redmine-API-Key': apiKey }
    }
  } else {
    return {
      headers: {
        'X-Redmine-API-Key': apiKey,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Safari/537.36 OPR/90.0.4480.78 (Edition std-1)'
      }
    }
  }
}

const getValueFromArray = (array = [], key = '') => {
  if (array.length === 0) return null
  for (const item of array) {
    if (item.name === key) return item.value
  }
  return null
}

const parseValueFromArray = (array = []) => {
  const list = []
  for (const item of array) {
    list.push(item.name?.toLowerCase())
  }
  return list
}

async function fetchData (endpoint, apiKey) {
  try {
    const res = await client.get(endpoint, {
      headers: {
        'X-Redmine-API-Key': apiKey,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.102 Safari/537.36 OPR/90.0.4480.78 (Edition std-1)'
      }
    })
    if (res.statusText === 'OK') return res.data
    else return null
  } catch (error) {
    console.log(error)
    return null
  }
}

module.exports = {
  makeConfig,
  getValueFromArray,
  parseValueFromArray,
  fetchData
}
