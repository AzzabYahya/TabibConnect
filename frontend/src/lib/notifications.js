import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  Info,
} from 'lucide-react';

export const NOTIFICATION_CATEGORIES = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'RENDEZ_VOUS', label: 'Rendez-vous' },
  { value: 'PAIEMENT', label: 'Paiement' },
  { value: 'ORDONNANCE', label: 'Ordonnance' },
  { value: 'SYSTEME', label: 'Système' },
];

export const categoryBadgeVariant = {
  RENDEZ_VOUS: 'info',
  PAIEMENT: 'success',
  ORDONNANCE: 'success',
  SYSTEME: 'neutral',
};

export const categoryIcon = {
  RENDEZ_VOUS: CalendarDays,
  PAIEMENT: CreditCard,
  ORDONNANCE: FileText,
  SYSTEME: Info,
};

export const getCategoryIcon = (category) => categoryIcon[category] || Bell;

export const formatNotificationDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('fr-MA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getMetadataDetails = (notification) => {
  const metadata = notification?.metadata || {};
  const details = [];

  if (metadata.reference) {
    details.push({ label: 'Référence paiement', value: metadata.reference });
  }
  if (metadata.cancelledByRole) {
    details.push({
      label: 'Annulé par',
      value: metadata.cancelledByRole === 'DOCTOR' ? 'Le médecin' : 'Le patient',
    });
  }
  if (typeof metadata.freeCancellation === 'boolean') {
    details.push({
      label: 'Annulation',
      value: metadata.freeCancellation ? 'Sans frais' : 'Hors délai',
    });
  }
  if (metadata.rescheduledByRole) {
    details.push({
      label: 'Reprogrammé par',
      value: metadata.rescheduledByRole === 'DOCTOR' ? 'Le médecin' : 'Le patient',
    });
  }
  if (metadata.reason) {
    details.push({ label: 'Motif', value: metadata.reason });
  }
  if (metadata.event) {
    const eventLabels = {
      CREATED: 'Demande enregistrée',
      CONFIRMED: 'Confirmé',
      CANCELLED: 'Annulé',
      REMINDER: 'Rappel',
      COMPLETED: 'Terminé',
      NO_SHOW: 'Absent',
      RESCHEDULED: 'Reprogrammé',
      PAID: 'Payé',
      CASH: 'Espèces sur place',
      GATEWAY_UNAVAILABLE: 'Passerelle indisponible',
      CREATED: 'Création',
      UPLOADED: 'Document uploadé',
      RESENT: 'Renvoyé',
    };
    details.push({ label: 'Événement', value: eventLabels[metadata.event] || metadata.event });
  }

  return details;
};

export const truncateText = (text, max = 120) => {
  const value = String(text || '');
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}…`;
};
