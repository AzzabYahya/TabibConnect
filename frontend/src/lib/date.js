import { format } from 'date-fns';
import { arSA, fr } from 'date-fns/locale';

const localeByLanguage = {
  ar: arSA,
  fr,
};

export const formatAppointmentDate = (dateValue, language = 'fr') => {
  return format(new Date(dateValue), "PPPP 'a' HH:mm", {
    locale: localeByLanguage[language] || fr,
  });
};
