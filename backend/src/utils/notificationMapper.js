const notificationTitles = {
  RAPPEL_RDV: 'Rappel de rendez-vous',
  RDV_CONFIRME: 'Rendez-vous confirmé',
  RDV_ANNULE: 'Rendez-vous annulé',
  PAIEMENT_RECU: 'Paiement reçu',
  SYSTEME: 'Information système',
};

const categoryLabels = {
  RENDEZ_VOUS: 'Rendez-vous',
  PAIEMENT: 'Paiement',
  ORDONNANCE: 'Ordonnance',
  SYSTEME: 'Système',
};

const buildRelativeLabel = (dateValue) => {
  const date = new Date(dateValue);
  const diffInMinutes = Math.round((Date.now() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return "À l'instant";
  if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) return `Il y a ${diffInHours} h`;

  return date.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' });
};

const resolveCategory = (type, metadata = {}) => {
  if (metadata?.category) return metadata.category;
  if (type === 'PAIEMENT_RECU') return 'PAIEMENT';
  if (['RAPPEL_RDV', 'RDV_CONFIRME', 'RDV_ANNULE'].includes(type)) return 'RENDEZ_VOUS';
  return 'SYSTEME';
};

const resolveActions = (type, metadata = {}, userRole = null, targetUserId = null) => {
  const actions = [];
  const appointmentId = metadata?.appointmentId;

  if (appointmentId) {
    actions.push({
      key: 'view-appointment',
      label: 'Voir le rendez-vous',
      path: `/appointment/${appointmentId}`,
      variant: 'primary',
    });
  }

  if (metadata?.category === 'ORDONNANCE' && appointmentId) {
    actions.push({
      key: 'view-ordonnance',
      label: "Consulter l'ordonnance",
      path: `/appointment/${appointmentId}`,
      variant: 'outline',
    });
  }

  if (metadata?.event === 'COMPLETED' && appointmentId && userRole === 'PATIENT') {
    actions.push({
      key: 'leave-review',
      label: 'Laisser un avis',
      path: `/appointment/${appointmentId}`,
      variant: 'outline',
    });
  }

  if (type === 'RDV_ANNULE' && appointmentId && userRole === 'PATIENT') {
    actions.push({
      key: 'rebook',
      label: 'Rechercher un médecin',
      path: '/search',
      variant: 'outline',
    });
  }

  if (metadata?.doctorId && userRole === 'PATIENT') {
    actions.push({
      key: 'view-doctor',
      label: 'Voir le profil médecin',
      path: `/doctor/${metadata.doctorId}`,
      variant: 'outline',
    });
  }

  if (targetUserId && userRole === 'ADMIN') {
    actions.push({
      key: 'view-user',
      label: 'Voir le compte utilisateur',
      path: `/dashboard/admin/accounts/${targetUserId}`,
      variant: 'outline',
    });
  }

  return actions;
};

const mapNotification = (notification, options = {}) => {
  const metadata = notification.metadata && typeof notification.metadata === 'object' ? notification.metadata : null;
  const category = resolveCategory(notification.type, metadata || {});

  return {
    id: notification.id,
    type: notification.type,
    category,
    label: categoryLabels[category] || 'Notification',
    title: notificationTitles[notification.type] || 'Notification',
    body: notification.message,
    time: buildRelativeLabel(notification.createdAt),
    createdAt: notification.createdAt,
    isRead: notification.isRead,
    metadata,
    actions: resolveActions(
      notification.type,
      metadata || {},
      options.userRole,
      notification.user?.id || null
    ),
    ...(options.includeUser && notification.user ? { user: notification.user } : {}),
  };
};

module.exports = {
  buildRelativeLabel,
  mapNotification,
  notificationTitles,
  categoryLabels,
  resolveCategory,
};
