jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}))

jest.mock('../../src/config/env', () => ({
  refreshTokenCookieName: 'tabibconnect_refresh_token',
  jwtRefreshSecret: 'refresh-secret',
}))

jest.mock('../../src/services/authService', () => ({
  logout: jest.fn(),
}))

jest.mock('../../src/utils/tokenUtils', () => ({
  clearRefreshTokenCookie: jest.fn(),
  setRefreshTokenCookie: jest.fn(),
}))

const jwt = require('jsonwebtoken')
const authService = require('../../src/services/authService')
const { clearRefreshTokenCookie } = require('../../src/utils/tokenUtils')
const authController = require('../../src/controllers/authController')

const createResponse = () => {
  const res = {}

  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)

  return res
}

describe('authController.logout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('revokes the session when the refresh token is valid', async () => {
    jwt.verify.mockReturnValue({
      sub: 'user-1',
      tokenType: 'refresh',
    })

    const req = {
      cookies: {
        tabibconnect_refresh_token: 'refresh-token',
      },
    }
    const res = createResponse()

    await authController.logout(req, res)

    expect(authService.logout).toHaveBeenCalledWith({ userId: 'user-1' })
    expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Logout successful',
    })
  })

  test('still succeeds when the refresh token is expired', async () => {
    const expiredTokenError = new Error('TokenExpiredError')
    expiredTokenError.name = 'TokenExpiredError'
    jwt.verify.mockImplementation(() => {
      throw expiredTokenError
    })

    const req = {
      cookies: {
        tabibconnect_refresh_token: 'expired-refresh-token',
      },
    }
    const res = createResponse()

    await authController.logout(req, res)

    expect(authService.logout).not.toHaveBeenCalled()
    expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      message: 'Logout successful',
    })
  })
})