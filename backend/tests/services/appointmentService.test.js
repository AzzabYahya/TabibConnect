const fixedNow = new Date('2025-04-22T09:00:00.000Z')

const mockTransaction = {
  disponibilite: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  rendezVous: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
}

const mockPrisma = {
  patient: {
    findUnique: jest.fn(),
  },
  doctor: {
    findUnique: jest.fn(),
  },
  disponibilite: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  rendezVous: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(async (callback) => callback(mockTransaction)),
}

const mockEnv = {
  freeCancellationHours: 2,
  reminderHoursBefore: 24,
  reminderWindowMinutes: 10,
  noShowGraceMinutes: 30,
}

const mockAvailabilityService = {
  computeDoctorAvailabilitiesByDate: jest.fn(),
}

const mockNotifications = {
  sendAppointmentCancelledNotifications: jest.fn(),
  sendAppointmentConfirmedNotifications: jest.fn(),
  sendAppointmentCreatedNotifications: jest.fn(),
  sendAppointmentNoShowNotifications: jest.fn(),
  sendAppointmentReminderNotifications: jest.fn(),
}

jest.mock('../../src/config/prisma', () => mockPrisma)
jest.mock('../../src/config/env', () => mockEnv)
jest.mock('../../src/services/availabilityService', () => mockAvailabilityService)
jest.mock('../../src/services/appointmentNotificationService', () => mockNotifications)

const appointmentService = require('../../src/services/appointmentService')

describe('appointmentService', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(fixedNow)
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('creates a new appointment when the slot is still available', async () => {
    const requestedStart = new Date('2025-04-22T12:00:00.000Z')
    const requestedEnd = new Date('2025-04-22T12:30:00.000Z')

    mockPrisma.patient.findUnique.mockResolvedValue({
      id: 'patient-1',
      userId: 'user-1',
    })
    mockPrisma.doctor.findUnique.mockResolvedValue({
      id: 'doctor-1',
      userId: 'doctor-user-1',
      user: {
        isVerified: true,
      },
    })
    mockAvailabilityService.computeDoctorAvailabilitiesByDate.mockResolvedValue([
      {
        disponibiliteId: 'dispo-1',
        slots: [
          {
            start: requestedStart.toISOString(),
            end: requestedEnd.toISOString(),
          },
        ],
      },
    ])
    mockTransaction.disponibilite.findUnique.mockResolvedValue({
      id: 'dispo-1',
      doctorId: 'doctor-1',
      cabinetId: 'cab-1',
      dureeConsultation: 30,
      bookingVersion: 4,
      isActive: true,
    })
    mockTransaction.disponibilite.updateMany.mockResolvedValue({ count: 1 })
    mockTransaction.rendezVous.findMany.mockResolvedValue([])
    mockTransaction.rendezVous.create.mockResolvedValue({
      id: 'rdv-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      disponibiliteId: 'dispo-1',
      cabinetId: 'cab-1',
      statut: 'EN_ATTENTE',
      dateHeure: requestedStart,
    })

    const result = await appointmentService.createAppointment({
      userId: 'user-1',
      payload: {
        doctorId: 'doctor-1',
        disponibiliteId: 'dispo-1',
        cabinetId: 'cab-1',
        motif: 'Consultation de suivi',
        typeConsultation: 'PRESENTIEL',
        methodePaiement: 'CMI',
        acceptedGeneralTerms: true,
        acceptedCashPolicy: false,
        notes: 'Preferer le matin',
        dateHeure: requestedStart.toISOString(),
      },
    })

    expect(result).toMatchObject({
      id: 'rdv-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      statut: 'EN_ATTENTE',
    })
    expect(mockNotifications.sendAppointmentCreatedNotifications).toHaveBeenCalledWith(result)
  })

  test('blocks patient cancellation inside the free cancellation window', async () => {
    mockPrisma.rendezVous.findUnique.mockResolvedValue({
      id: 'rdv-2',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      statut: 'CONFIRME',
      version: 3,
      dateHeure: new Date('2025-04-22T10:00:00.000Z').toISOString(),
      patient: {
        user: {
          email: 'patient@example.com',
          phone: '+212600000000',
        },
      },
      doctor: {
        user: {
          email: 'doctor@example.com',
          phone: '+212600000001',
        },
      },
      cabinet: {
        id: 'cab-1',
      },
      disponibilite: {
        dureeConsultation: 30,
      },
    })
    mockPrisma.patient.findUnique.mockResolvedValue({
      id: 'patient-1',
      userId: 'user-1',
    })

    await expect(
      appointmentService.cancelAppointment({
        appointmentId: 'rdv-2',
        userId: 'user-1',
        role: 'PATIENT',
        reason: 'Indisponibilite',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Patient cancellation is only allowed up to 2h before the appointment',
    })

    expect(mockPrisma.rendezVous.updateMany).not.toHaveBeenCalled()
    expect(mockNotifications.sendAppointmentCancelledNotifications).not.toHaveBeenCalled()
  })

  test('returns appointment details for the linked patient', async () => {
    mockPrisma.rendezVous.findUnique.mockResolvedValue({
      id: 'rdv-3',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      statut: 'CONFIRME',
      typeConsultation: 'TELECONSULTATION',
      motif: 'Suivi cardio',
      notes: 'Apporter les analyses',
      cancellationReason: null,
      dateHeure: new Date('2025-04-22T12:00:00.000Z'),
      patient: {
        user: {
          email: 'patient@example.com',
          phone: '+212600000000',
        },
      },
      doctor: {
        nomComplet: 'Dr Amine Fassi',
        specialite: 'Cardiologie',
        tarifConsultation: '400.00',
        user: {
          email: 'doctor@example.com',
          phone: '+212600000001',
        },
      },
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
    })
    mockPrisma.patient.findUnique.mockResolvedValue({
      id: 'patient-1',
      userId: 'user-1',
    })

    const result = await appointmentService.getAppointmentDetails({
      appointmentId: 'rdv-3',
      userId: 'user-1',
      role: 'PATIENT',
    })

    expect(result).toMatchObject({
      id: 'rdv-3',
      status: 'CONFIRME',
      typeConsultation: 'TELECONSULTATION',
      doctor: {
        name: 'Dr Amine Fassi',
        specialty: 'Cardiologie',
        fee: 400,
      },
      cabinet: {
        name: 'Cabinet Coeur Casa',
        city: 'Casablanca',
      },
      durationMinutes: 30,
    })
    expect(result.joinUrl).toBeNull()
  })
})