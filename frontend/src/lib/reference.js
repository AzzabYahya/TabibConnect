export const formatAppointmentReference = (id) => {
  if (!id) {
    return 'RDV';
  }

  const normalized = String(id).replace(/[^a-z0-9]/gi, '');
  if (!normalized) {
    return 'RDV';
  }

  if (normalized.length <= 8) {
    return `RDV-${normalized.toUpperCase()}`;
  }

  const head = normalized.slice(0, 4).toUpperCase();
  const tail = normalized.slice(-4).toUpperCase();
  return `RDV-${head}-${tail}`;
};
