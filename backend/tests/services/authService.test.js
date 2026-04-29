jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

jest.mock('../../src/config/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  patient: {
    findUnique: jest.fn(),
  },
  doctor: {
    findUnique: jest.fn(),
  },
}))

jest.mock('../../src/utils/tokenUtils', () => ({
  createAccessToken: jest.fn(),
  createRefreshToken: jest.fn(),
  generateOpaqueToken: jest.fn(() => 'opaque-token'),
  getFutureDateFromDuration: jest.fn(() => new Date('2025-01-01T00:00:00.000Z')),
  hashOpaqueToken: jest.fn(() => 'hashed-token'),
}))

jest.mock('../../src/services/emailService', () => ({
  sendResetPasswordEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
}))

const bcrypt = require('bcryptjs')
const prisma = require('../../src/config/prisma')
const tokenUtils = require('../../src/utils/tokenUtils')
const authService = require('../../src/services/authService')

describe('authService.login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('issues session tokens for a verified user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'patient@example.com',
      phone: '+212600000000',
      role: 'PATIENT',
      isVerified: true,
      password: 'hashed-password',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      patient: {
        id: 'patient-1',
      },
      doctor: null,
    })
    bcrypt.compare.mockResolvedValue(true)
    bcrypt.hash.mockResolvedValue('hashed-refresh-token')
    tokenUtils.createAccessToken.mockReturnValue('access-token')
    tokenUtils.createRefreshToken.mockReturnValue('refresh-token')
    prisma.user.update.mockResolvedValue({ id: 'user-1' })

    const result = await authService.login({
      email: 'patient@example.com',
      password: 'secret-password',
    })

    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'patient@example.com',
        role: 'PATIENT',
        patientId: 'patient-1',
        doctorId: null,
      },
    })
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          refreshTokenHash: 'hashed-refresh-token',
          lastLoginAt: expect.any(Date),
        }),
      })
    )
    expect(tokenUtils.createAccessToken).toHaveBeenCalledWith({ id: 'user-1', role: 'PATIENT' })
    expect(tokenUtils.createRefreshToken).toHaveBeenCalledWith({ id: 'user-1', role: 'PATIENT' })
  })

  test('rejects invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(
      authService.login({
        email: 'unknown@example.com',
        password: 'wrong-password',
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
    })
  })
})