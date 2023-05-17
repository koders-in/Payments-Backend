const request = require('supertest')
const app = require('../src/server')
const { describe, test, expect } = require('@jest/globals')

describe('Test the root path', () => {
  const data = {
    project: '89',
    apiKey: process.env.REDMINE_API_KEY,
    issues: ['2079']
  }
  test('should return data from /invoice endpoint', async () => {
    const response = await request(app).post('/invoice').send(data)
    expect(response.data).not.toBeNull()
  })
  test('should return data from /get-project endpoint', async () => {
    const repsonse = await request(app).post('/get-project').send(data)
    expect(repsonse.data).not.toBeNull()
  })
  test('should return data from /get-budget endpoint', async () => {
    const response = await request(app).post('/get-budget').send(data)
    expect(response.data).not.toBeNull()
  })
})
