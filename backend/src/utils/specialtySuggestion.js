const symptomSpecialtyMap = require('../data/symptomSpecialtyMap.json');

const normalize = (value) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const suggestSpecialties = (query) => {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return [];
  }

  const matchedSpecialties = new Set();

  Object.entries(symptomSpecialtyMap).forEach(([symptom, config]) => {
    const normalizedSymptom = normalize(symptom);

    if (normalizedQuery.includes(normalizedSymptom)) {
      config.specialites.forEach((speciality) => matchedSpecialties.add(speciality));
      return;
    }

    const keywordMatch = (config.keywords || []).some((keyword) => {
      const normalizedKeyword = normalize(keyword);
      return (
        normalizedQuery.includes(normalizedKeyword) ||
        normalizedKeyword.includes(normalizedQuery)
      );
    });

    if (keywordMatch) {
      config.specialites.forEach((speciality) => matchedSpecialties.add(speciality));
    }
  });

  return Array.from(matchedSpecialties);
};

module.exports = {
  suggestSpecialties,
};
