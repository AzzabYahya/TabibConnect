jest.mock('../../src/config/prisma', () => ({
  user: {
    count: jest.fn(),
  },
  patient: {
    count: jest.fn(),
  },
  rendezVous: {
    count: jest.fn(),
  },
  avis: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  doctor: {
    findMany: jest.fn(),
  },
  cabinet: {
    findMany: jest.fn(),
  },
}))

const prisma = require('../../src/config/prisma')
const homeService = require('../../src/services/homeService')

describe('homeService.getHomeSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns live overview counts from the database', async () => {
    prisma.user.count.mockResolvedValue(8)
    prisma.patient.count.mockResolvedValue(14)
    prisma.rendezVous.count.mockResolvedValue(22)
    prisma.avis.count.mockResolvedValue(6)
    prisma.doctor.findMany.mockResolvedValue([
      {
        id: 'doctor-1',
        specialite: 'Cardiologie / Tibb Al-Qalb',
        doctorCabinets: [
          {
            cabinet: {
              id: 'cabinet-1',
              ville: 'Casablanca',
              quartier: 'Maarif',
              latitude: '33.5731',
              longitude: '-7.5898',
            },
          },
          {
            cabinet: {
              id: 'cabinet-2',
              ville: 'Rabat',
              quartier: 'Agdal',
              latitude: '34.0209',
              longitude: '-6.8417',
            },
          },
        ],
      },
      {
        id: 'doctor-2',
        specialite: 'Dermatologie / Amrad Al-Jild',
        doctorCabinets: [
          {
            cabinet: {
              id: 'cabinet-3',
              ville: 'Marrakech',
              quartier: 'Gueliz',
              latitude: '31.6295',
              longitude: '-7.9811',
            },
          },
        ],
      },
    ])
    prisma.cabinet.findMany.mockResolvedValue([
      {
        id: 'cabinet-1',
        ville: 'Casablanca',
        quartier: 'Maarif',
        latitude: '33.5731',
        longitude: '-7.5898',
      },
      {
        id: 'cabinet-2',
        ville: 'Rabat',
        quartier: 'Agdal',
        latitude: '34.0209',
        longitude: '-6.8417',
      },
      {
        id: 'cabinet-3',
        ville: 'Marrakech',
        quartier: 'Gueliz',
        latitude: '31.6295',
        longitude: '-7.9811',
      },
    ])
    prisma.avis.findMany.mockResolvedValue([
      {
        commentaire: 'Très bon suivi.',
        note: 5,
        createdAt: new Date('2026-04-24T10:00:00.000Z'),
        patient: {
          user: {
            email: 'youssef.benali@tabibconnect.ma',
          },
        },
        doctor: {
          nomComplet: 'Dr Amine Fassi',
          specialite: 'Cardiologie / Tibb Al-Qalb',
        },
      },
    ])

    const result = await homeService.getHomeSummary()

    expect(result.overview).toEqual({
      verifiedDoctorsCount: 8,
      citiesCount: 3,
    })
    expect(result.stats[0]).toMatchObject({
      label: 'Medecins verifies',
      value: 8,
      suffix: '+',
    })
    expect(result.hotspots).toHaveLength(3)
    expect(result.hotspots.map((item) => item.ville)).toEqual(
      expect.arrayContaining(['Casablanca', 'Rabat', 'Marrakech'])
    )
  })
})