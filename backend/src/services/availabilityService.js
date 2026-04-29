const prisma = require('../config/prisma');

const JOURS_SEMAINE = [
  'DIMANCHE',
  'LUNDI',
  'MARDI',
  'MERCREDI',
  'JEUDI',
  'VENDREDI',
  'SAMEDI',
];

const BLOCKING_STATUSES = ['EN_ATTENTE', 'CONFIRME'];

const formatDateToISO = (dateValue) => {
  if (typeof dateValue === 'string' && dateValue) {
    return dateValue;
  }

  const date = new Date();
  return date.toISOString().slice(0, 10);
};

const getDayEnum = (dateISO) => {
  const date = new Date(`${dateISO}T00:00:00`);
  return JOURS_SEMAINE[date.getDay()];
};

const combineDateAndTime = (dateISO, time) => {
  return new Date(`${dateISO}T${time}:00`);
};

const generateSlotIntervals = ({ dateISO, heureDebut, heureFin, dureeConsultation }) => {
  const start = combineDateAndTime(dateISO, heureDebut);
  const end = combineDateAndTime(dateISO, heureFin);

  const slots = [];
  const current = new Date(start);

  while (current < end) {
    const slotStart = new Date(current);
    const slotEnd = new Date(current.getTime() + dureeConsultation * 60 * 1000);

    if (slotEnd > end) {
      break;
    }

    slots.push({ slotStart, slotEnd });
    current.setMinutes(current.getMinutes() + dureeConsultation);
  }

  return slots;
};

const intervalsOverlap = (aStart, aEnd, bStart, bEnd) => {
  return aStart < bEnd && bStart < aEnd;
};

const computeDoctorAvailabilitiesByDate = async ({ doctorId, dateISO }) => {
  const targetDateISO = formatDateToISO(dateISO);
  const dayEnum = getDayEnum(targetDateISO);

  const [disponibilites, rendezVous] = await Promise.all([
    prisma.disponibilite.findMany({
      where: {
        doctorId,
        jourSemaine: dayEnum,
        isActive: true,
      },
      include: {
        cabinet: {
          select: {
            id: true,
            nom: true,
            ville: true,
            quartier: true,
          },
        },
      },
      orderBy: [{ heureDebut: 'asc' }],
    }),
    prisma.rendezVous.findMany({
      where: {
        doctorId,
        statut: {
          in: BLOCKING_STATUSES,
        },
        dateHeure: {
          gte: new Date(`${targetDateISO}T00:00:00`),
          lt: new Date(`${targetDateISO}T23:59:59.999`),
        },
      },
      include: {
        disponibilite: {
          select: {
            dureeConsultation: true,
          },
        },
      },
    }),
  ]);

  const now = new Date();

  const grouped = disponibilites.map((disponibilite) => {
    const slots = generateSlotIntervals({
      dateISO: targetDateISO,
      heureDebut: disponibilite.heureDebut,
      heureFin: disponibilite.heureFin,
      dureeConsultation: disponibilite.dureeConsultation,
    })
      .filter(({ slotStart, slotEnd }) => {
        if (slotStart <= now) {
          return false;
        }

        const conflicts = rendezVous.some((rdv) => {
          const rdvStart = new Date(rdv.dateHeure);
          const durationInMinutes = rdv.disponibilite?.dureeConsultation || 30;
          const rdvEnd = new Date(rdvStart.getTime() + durationInMinutes * 60 * 1000);

          return intervalsOverlap(slotStart, slotEnd, rdvStart, rdvEnd);
        });

        return !conflicts;
      })
      .map(({ slotStart, slotEnd }) => ({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
      }));

    return {
      disponibiliteId: disponibilite.id,
      cabinet: disponibilite.cabinet,
      date: targetDateISO,
      heureDebut: disponibilite.heureDebut,
      heureFin: disponibilite.heureFin,
      dureeConsultation: disponibilite.dureeConsultation,
      slots,
      totalSlots: slots.length,
    };
  });

  return grouped;
};

const doctorHasAvailabilityOnDate = async ({ doctorId, dateISO }) => {
  const availabilities = await computeDoctorAvailabilitiesByDate({ doctorId, dateISO });
  return availabilities.some((item) => item.totalSlots > 0);
};

module.exports = {
  computeDoctorAvailabilitiesByDate,
  doctorHasAvailabilityOnDate,
};
