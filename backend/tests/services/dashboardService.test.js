const fixedNow = new Date('2025-04-22T09:00:00.000Z')

const mockPrisma = {
  patient: {
    findUnique: jest.fn(),
  },
  rendezVous: {
    findMany: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
  },
}

const mockEnv = {
  demoPatientEmail: 'youssef.benali@tabibconnect.ma',
}

jest.mock('../../src/config/prisma', () => mockPrisma)
jest.mock('../../src/config/env', () => mockEnv)

const dashboardService = require('../../src/services/dashboardService')

describe('dashboardService', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(fixedNow)
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('builds a patient dashboard from persisted data', async () => {
    mockPrisma.patient.findUnique.mockResolvedValue({
      id: 'patient-1',
      userId: 'user-1',
      dateOfNaissance: new Date('1990-01-01T00:00:00.000Z'),
      sexe: 'HOMME',
      adresse: 'Maarif Extension, Rue 12',
      ville: 'Casablanca',
      groupeSanguin: 'O_POS',
      antecedents: 'Allergie legere aux penicillines',
      user: {
        email: 'youssef.benali@tabibconnect.ma',
        phone: '+212612345678',
        isVerified: true,
        createdAt: new Date('2025-01-10T00:00:00.000Z'),
      },
    })

    mockPrisma.rendezVous.findMany.mockResolvedValue([
      {
        id: 'rdv-upcoming',
        doctorId: 'doctor-1',
        statut: 'CONFIRME',
        typeConsultation: 'TELECONSULTATION',
        motif: 'Suivi cardio',
        notes: 'Apporter les analyses',
        cancellationReason: null,
        dateHeure: new Date('2025-04-22T12:00:00.000Z'),
        cabinet: {
          id: 'cab-1',
          nom: 'Cabinet Coeur Casa',
          adresse: 'Bd Ghandi',
          ville: 'Casablanca',
          quartier: 'Maarif',
        },
        disponibilite: {
          dureeConsultation: 30,
        },
        doctor: {
          nomComplet: 'Dr Amine Fassi',
          specialite: 'Cardiologie',
          tarifConsultation: '400.00',
          user: {
            email: 'dr.amine.fassi@tabibconnect.ma',
          },
          doctorCabinets: [],
        },
        avis: null,
      },
      {
        id: 'rdv-history',
        doctorId: 'doctor-1',
        statut: 'COMPLETE',
        typeConsultation: 'PRESENTIEL',
        motif: 'Controle annuel',
        notes: 'Ordonnance mise a jour',
        cancellationReason: null,
        dateHeure: new Date('2025-04-10T10:00:00.000Z'),
        cabinet: {
          id: 'cab-1',
          nom: 'Cabinet Coeur Casa',
          adresse: 'Bd Ghandi',
          ville: 'Casablanca',
          quartier: 'Maarif',
        },
        disponibilite: {
          dureeConsultation: 30,
        },
        doctor: {
          nomComplet: 'Dr Amine Fassi',
          specialite: 'Cardiologie',
          tarifConsultation: '400.00',
          user: {
            email: 'dr.amine.fassi@tabibconnect.ma',
          },
          doctorCabinets: [],
        },
        avis: null,
      },
    ])

    mockPrisma.notification.findMany.mockResolvedValue([
      {
        id: 'notif-1',
        type: 'RDV_CONFIRME',
        message: 'Votre rendez-vous a ete confirme.',
        isRead: false,
        createdAt: new Date('2025-04-22T08:45:00.000Z'),
      },
    ])

    const result = await dashboardService.getPatientDashboard({
      userId: 'user-1',
    })

    expect(result.patient.displayName).toBe('Youssef Benali')
    expect(result.summary).toEqual({
      upcomingAppointments: 1,
      historyCount: 1,
      favoriteDoctors: 1,
      unreadNotifications: 1,
    })
    expect(result.upcomingAppointment).toMatchObject({
      id: 'rdv-upcoming',
      doctorName: 'Dr Amine Fassi',
      specialty: 'Cardiologie',
      type: 'TELECONSULTATION',
    })
    expect(result.historyAppointments).toHaveLength(1)
    expect(result.favoriteDoctors).toHaveLength(1)
    expect(result.notifications[0]).toMatchObject({
      title: 'Rendez-vous confirme',
      body: 'Votre rendez-vous a ete confirme.',
      isRead: false,
    })
    expect(result.reviewPrompt).toMatchObject({
      id: 'rdv-history',
      doctorName: 'Dr Amine Fassi',
    })
  })
})
