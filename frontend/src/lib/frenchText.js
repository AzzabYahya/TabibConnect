import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Baby, Bone, Brain, Ear, Eye, HeartPulse, Sparkles, Stethoscope } from 'lucide-react';

const specialtyDisplayMap = {
  cardiologie: {
    labelFr: 'Cardiologie',
    labelAr: 'طب القلب',
    Icon: HeartPulse,
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  neurologie: {
    labelFr: 'Neurologie',
    labelAr: 'طب الأعصاب',
    Icon: Brain,
    backgroundColor: '#EDE9FE',
    color: '#7C3AED',
  },
  orthopedie: {
    labelFr: 'Orthopédie',
    labelAr: 'جراحة العظام',
    Icon: Bone,
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  ophtalmologie: {
    labelFr: 'Ophtalmologie',
    labelAr: 'طب العيون',
    Icon: Eye,
    backgroundColor: '#DBEAFE',
    color: '#2563EB',
  },
  pediatrie: {
    labelFr: 'Pédiatrie',
    labelAr: 'طب الأطفال',
    Icon: Baby,
    backgroundColor: '#DCFCE7',
    color: '#16A34A',
  },
  dermatologie: {
    labelFr: 'Dermatologie',
    labelAr: 'طب الجلد',
    Icon: Sparkles,
    backgroundColor: '#FCE7F3',
    color: '#DB2777',
  },
  orl: {
    labelFr: 'ORL',
    labelAr: 'الأنف والأذن والحنجرة',
    Icon: Ear,
    backgroundColor: '#E0F2FE',
    color: '#0284C7',
  },
  'medecine generale': {
    labelFr: 'Médecine générale',
    labelAr: 'الطب العام',
    Icon: Stethoscope,
    backgroundColor: '#F1F5F9',
    color: '#475569',
  },
};

const commonLabelMap = {
  'medecins verifies': 'Médecins vérifiés',
  'medecin verifie': 'Médecin vérifié',
  'avis publies': 'Avis publiés',
  'cabinets medicaux actifs': 'Cabinets médicaux actifs',
  'cabinets connectes': 'Cabinets connectés',
  'rdv enregistres': 'RDV enregistrés',
  medecin: 'Médecin',
  medecins: 'Médecins',
  reservation: 'réservation',
  reservations: 'réservations',
  presentiel: 'présentiel',
  references: 'référencés',
  verifiees: 'vérifiées',
  sante: 'santé',
};

export const normalizeFrenchKey = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();

export const formatSpecialtyLabel = (value = '') => {
  const normalizedKey = normalizeFrenchKey(value);
  const specialty = specialtyDisplayMap[normalizedKey];

  if (specialty) {
    return specialty.labelFr;
  }

  const commonLabel = commonLabelMap[normalizedKey];

  if (commonLabel) {
    return commonLabel;
  }

  return String(value)
    .trim()
    .replace(/medecine generale/gi, 'Médecine générale')
    .replace(/orthopedie/gi, 'Orthopédie')
    .replace(/pediatrie/gi, 'Pédiatrie')
    .replace(/specialite/gi, 'spécialité')
    .replace(/medecin/gi, 'médecin')
    .replace(/reservation/gi, 'réservation')
    .replace(/presentiel/gi, 'présentiel')
    .replace(/references/gi, 'référencés')
    .replace(/verifiees/gi, 'vérifiées')
    .replace(/sante/gi, 'santé');
};

export const formatFrenchLabel = (value = '') => {
  const normalizedKey = normalizeFrenchKey(value);
  return commonLabelMap[normalizedKey] || formatSpecialtyLabel(value);
};

export const getSpecialtyDisplayMeta = (value = '') => {
  const normalizedKey = normalizeFrenchKey(value);
  const specialty = specialtyDisplayMap[normalizedKey];

  if (specialty) {
    return specialty;
  }

  const labelFr = formatSpecialtyLabel(value);

  return {
    labelFr,
    labelAr: labelFr,
    Icon: Stethoscope,
    backgroundColor: '#F8FAFC',
    color: '#475569',
  };
};

export const getInitials = (name = '') =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export const hashColor = (value = '') => {
  let hash = 0;

  for (const char of String(value)) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 68% 44%)`;
};

const resolveDate = (dateValue) => {
  if (!dateValue) {
    return null;
  }

  const parsedDate = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);

  return isValid(parsedDate) ? parsedDate : null;
};

export const formatReviewDate = (dateValue, fallbackText = '') => {
  const date = resolveDate(dateValue);

  if (!date) {
    return fallbackText;
  }

  const daysOld = Math.abs(Date.now() - date.getTime()) / (24 * 60 * 60 * 1000);

  if (daysOld < 7) {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: fr,
    });
  }

  return `le ${format(date, "d MMMM yyyy", { locale: fr })}`;
};
