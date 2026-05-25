const prisma = require('../config/prisma');
const { getCache, setCache } = require('../config/redis');
const symptomesMapping = require('../data/symptomes-mapping.json');

/**
 * Levenshtein distance – returns the edit-distance between two strings.
 * Used for fuzzy matching so users don't need to type exactly correct terms.
 */
const levenshtein = (a, b) => {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const matrix = [];
  for (let i = 0; i <= la; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= lb; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[la][lb];
};

const JOURS_SEMAINE = [
  'DIMANCHE',
  'LUNDI',
  'MARDI',
  'MERCREDI',
  'JEUDI',
  'VENDREDI',
  'SAMEDI',
];

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

/**
 * Fuzzy match: returns true if `needle` is approximately contained in `haystack`.
 * Uses a combination of substring match and Levenshtein distance.
 * Tolerance = max(2, floor(needle.length / 3))
 */
const fuzzyMatch = (haystack, needle) => {
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!n) return false;
  if (h.includes(n)) return true;

  // Sliding window of needle-length over haystack
  const tolerance = Math.max(2, Math.floor(n.length / 3));
  if (n.length > h.length) {
    return levenshtein(h, n) <= tolerance;
  }
  for (let i = 0; i <= h.length - n.length; i++) {
    const window = h.substring(i, i + n.length);
    if (levenshtein(window, n) <= tolerance) return true;
  }
  // Also check full-string similarity
  if (levenshtein(h, n) <= tolerance) return true;
  return false;
};

const toMinutes = (timeValue = '00:00') => {
  const [hour, minute] = String(timeValue).split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0;
  }
  return hour * 60 + minute;
};

const resolveNextAvailability = (disponibilites = []) => {
  const now = new Date();
  const nowDay = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let nextSlot = null;

  disponibilites
    .filter((disponibilite) => disponibilite.isActive)
    .forEach((disponibilite) => {
      const dayIndex = JOURS_SEMAINE.indexOf(disponibilite.jourSemaine);
      if (dayIndex < 0) {
        return;
      }

      const slotMinutes = toMinutes(disponibilite.heureDebut);
      let daysAhead = (dayIndex - nowDay + 7) % 7;

      if (daysAhead === 0 && slotMinutes <= nowMinutes) {
        daysAhead = 7;
      }

      const slotDate = new Date(now);
      slotDate.setDate(now.getDate() + daysAhead);
      const [hour, minute] = String(disponibilite.heureDebut).split(':').map(Number);
      slotDate.setHours(hour || 0, minute || 0, 0, 0);

      if (!nextSlot || slotDate < nextSlot) {
        nextSlot = slotDate;
      }
    });

  return nextSlot ? nextSlot.toISOString() : null;
};

const resolveDoctorCity = (doctorCabinets = [], villeFilter = '') => {
  const normalizedFilter = normalize(villeFilter);
  const cities = doctorCabinets
    .map((entry) => entry?.cabinet?.ville)
    .filter(Boolean);

  if (normalizedFilter) {
    const match = cities.find((city) => normalize(city).includes(normalizedFilter));
    if (match) {
      return match;
    }
  }

  return cities[0] || '';
};

const buildSpecialtySuggestions = (doctors = [], villeFilter = '') => {
  const normalizedFilter = normalize(villeFilter);
  const groups = new Map();

  doctors.forEach((doctor) => {
    const specialite = doctor.specialite || '';
    if (!specialite) {
      return;
    }

    const cities = (doctor.doctorCabinets || [])
      .map((entry) => entry?.cabinet?.ville)
      .filter(Boolean);

    const filteredCities = normalizedFilter
      ? cities.filter((city) => normalize(city).includes(normalizedFilter))
      : cities;

    if (normalizedFilter && filteredCities.length === 0) {
      return;
    }

    if (!groups.has(specialite)) {
      groups.set(specialite, { nom: specialite, count: 0, villes: new Set() });
    }

    const group = groups.get(specialite);
    group.count += 1;
    filteredCities.forEach((city) => group.villes.add(city));
  });

  return Array.from(groups.values())
    .map((group) => ({
      nom: group.nom,
      count: group.count,
      villes: Array.from(group.villes),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.nom.localeCompare(right.nom, 'fr');
    })
    .slice(0, 4);
};

const buildSymptomSuggestions = (query) => {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return [];
  }

  return Object.entries(symptomesMapping)
    .map(([symptome, specialite]) => {
      const normalizedSymptome = normalize(symptome);
      let score = 0;

      if (!normalizedSymptome || !fuzzyMatch(symptome, normalizedQuery)) {
        return null;
      }

      if (normalizedSymptome === normalizedQuery) {
        score = 100;
      } else if (normalizedSymptome.startsWith(normalizedQuery)) {
        score = 90;
      } else if (normalizedSymptome.includes(normalizedQuery)) {
        score = 80;
      } else {
        const tolerance = Math.max(2, Math.floor(normalizedQuery.length / 3));
        const distance = levenshtein(normalizedSymptome, normalizedQuery);
        score = Math.max(0, 70 - distance * 8);

        if (distance > tolerance) {
          score = Math.max(score, 35);
        }
      }

      return {
        symptome,
        specialite,
        score,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.symptome.localeCompare(right.symptome, 'fr');
    })
    .slice(0, 3)
    .map(({ symptome, specialite }) => ({
      symptome,
      specialite,
    }));
};

/**
 * Returns distinct filter options (specialties, languages) pulled live from the DB.
 * This ensures the search page filters always reflect current data.
 */
const getFilters = async (_req, res) => {
  const cacheKey = 'search:filters';
  const cached = await getCache(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return res.status(200).json({ status: 'success', data: parsed });
    } catch (error) {
      console.warn('Redis filter cache parse failed:', error?.message || error);
    }
  }

  // Fetch all verified doctors to extract distinct specialties and languages
  const doctors = await prisma.doctor.findMany({
    where: { user: { isVerified: true } },
    select: {
      specialite: true,
      languesParlees: true,
    },
  });

  // Collect unique specialties
  const specialtySet = new Set();
  doctors.forEach((d) => {
    if (d.specialite) specialtySet.add(d.specialite);
  });
  const specialites = Array.from(specialtySet).sort((a, b) =>
    a.localeCompare(b, 'fr')
  );

  // Collect unique languages with normalization to avoid duplicates (e.g. "Francais" vs "Français")
  const langueSet = new Set();
  doctors.forEach((d) => {
    (d.languesParlees || []).forEach((lang) => {
      if (lang) {
        let cleaned = lang.trim();
        const lower = cleaned.toLowerCase();
        if (lower.includes('fran')) {
          cleaned = 'Français';
        } else if (lower.includes('arab')) {
          cleaned = 'Arabe';
        } else if (lower.includes('darij')) {
          cleaned = 'Darija';
        } else if (lower.includes('angl') || lower.includes('engli')) {
          cleaned = 'Anglais';
        } else {
          cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }
        langueSet.add(cleaned);
      }
    });
  });
  const langues = Array.from(langueSet).sort((a, b) =>
    a.localeCompare(b, 'fr')
  );

  const payload = { specialites, langues };
  await setCache(cacheKey, JSON.stringify(payload), 300); // 5 min cache

  return res.status(200).json({
    status: 'success',
    data: payload,
  });
};

const getSuggestions = async (req, res) => {
  const query = String(req.query.q || '').trim();
  const ville = String(req.query.ville || '').trim();

  if (query.length < 2) {
    return res.status(200).json({
      status: 'success',
      data: { specialites: [], medecins: [], symptomes: [] },
    });
  }

  const cacheKey = `search:${normalize(query)}:${normalize(ville)}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return res.status(200).json({ status: 'success', data: parsed });
    } catch (error) {
      console.warn('Redis cache parse failed:', error?.message || error);
    }
  }

  // Fetch all verified doctors for fuzzy matching instead of DB ILIKE
  const allVerifiedDoctors = await prisma.doctor.findMany({
    where: { user: { isVerified: true } },
    select: {
      id: true,
      nomComplet: true,
      specialite: true,
      tarifConsultation: true,
      doctorCabinets: {
        select: {
          cabinet: {
            select: { ville: true },
          },
        },
      },
      disponibilites: {
        select: {
          jourSemaine: true,
          heureDebut: true,
          isActive: true,
        },
      },
    },
  });

  // Fuzzy-filter for specialty suggestions
  const specialtyDoctors = allVerifiedDoctors.filter((d) =>
    fuzzyMatch(d.specialite || '', query)
  );

  // Fuzzy-filter for doctor suggestions (name OR specialty match)
  let doctorMatches = allVerifiedDoctors.filter((d) => {
    const nameMatch = fuzzyMatch(d.nomComplet || '', query);
    const specMatch = fuzzyMatch(d.specialite || '', query);
    return nameMatch || specMatch;
  });

  // Apply city filter if provided
  if (ville) {
    doctorMatches = doctorMatches.filter((d) =>
      (d.doctorCabinets || []).some((dc) =>
        fuzzyMatch(dc.cabinet?.ville || '', ville)
      )
    );
  }

  // Limit to 12 for enrichment
  const doctors = doctorMatches.slice(0, 12);

  const doctorIds = doctors.map((doctor) => doctor.id);
  const profilePhotos = doctorIds.length
    ? await prisma.doctorDocument.findMany({
      where: {
        doctorId: { in: doctorIds },
        mimeType: { startsWith: 'image/' },
      },
      select: {
        id: true,
        doctorId: true,
        isProfilePhoto: true,
        createdAt: true,
      },
      orderBy: [
        { doctorId: 'asc' },
        { isProfilePhoto: 'desc' },
        { createdAt: 'desc' },
      ],
    })
    : [];
  const ratingRows = doctorIds.length
    ? await prisma.avis.groupBy({
      by: ['doctorId'],
      where: { doctorId: { in: doctorIds } },
      _avg: { note: true },
    })
    : [];

  const photoMap = new Map();
  profilePhotos.forEach((photo) => {
    if (!photoMap.has(photo.doctorId)) {
      photoMap.set(photo.doctorId, photo);
    }
  });

  const ratingMap = new Map(
    ratingRows.map((row) => [row.doctorId, Number(row._avg.note || 0)])
  );

  const medecins = doctors
    .map((doctor) => {
      const note = ratingMap.get(doctor.id) || 0;
      const photo = photoMap.get(doctor.id);
      return {
        id: doctor.id,
        nom: doctor.nomComplet || 'Dr.',
        specialite: doctor.specialite || '',
        ville: resolveDoctorCity(doctor.doctorCabinets, ville),
        note: Math.round(note * 10) / 10,
        tarif: Number(doctor.tarifConsultation || 0),
        prochainDispo: resolveNextAvailability(doctor.disponibilites),
        profilePhotoUrl: photo ? `/doctors/${doctor.id}/profile-photo?v=${photo.id}` : null,
      };
    })
    .sort((left, right) => {
      if (right.note !== left.note) {
        return right.note - left.note;
      }
      return left.tarif - right.tarif;
    })
    .slice(0, 4);

  const payload = {
    specialites: buildSpecialtySuggestions(specialtyDoctors, ville),
    medecins,
    symptomes: buildSymptomSuggestions(query),
  };

  await setCache(cacheKey, JSON.stringify(payload), 60);

  return res.status(200).json({
    status: 'success',
    data: payload,
  });
};

module.exports = {
  getFilters,
  getSuggestions,
};
