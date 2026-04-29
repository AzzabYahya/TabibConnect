const request = require('supertest')

const app = require('../../src/app')

describe('GET /api/health', () => {
  test('returns the API health payload', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      status: 'OK',
      project: 'TabibConnect',
      version: '1.0.0',
    })
  })
})