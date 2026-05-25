import { useNavigate } from 'react-router-dom';

import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import {
  categoryBadgeVariant,
  formatNotificationDate,
  getCategoryIcon,
  getMetadataDetails,
} from '../../lib/notifications';

function NotificationDetailModal({ notification, isOpen, onClose, onMarkRead }) {
  const navigate = useNavigate();

  if (!notification) return null;

  const Icon = getCategoryIcon(notification.category);
  const details = getMetadataDetails(notification);

  const handleAction = async (action) => {
    if (!notification.isRead) {
      await onMarkRead?.(notification.id);
    }
    onClose();
    if (action?.path) {
      navigate(action.path);
    }
  };

  const handleMarkRead = async () => {
    if (!notification.isRead) {
      await onMarkRead?.(notification.id);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Détail de la notification" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={categoryBadgeVariant[notification.category] || 'neutral'}>
            {notification.label}
          </Badge>
          {!notification.isRead ? <Badge variant="warning">Non lue</Badge> : <Badge variant="neutral">Lue</Badge>}
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
          <div className="rounded-full bg-white p-2 text-med-primary shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-base font-semibold text-slate-900">{notification.title}</p>
            <p className="text-xs text-slate-500">{formatNotificationDate(notification.createdAt)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{notification.body}</p>
        </div>

        {notification.user ? (
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span className="font-medium">Destinataire :</span> {notification.user.email} ({notification.user.role})
          </div>
        ) : null}

        {details.length ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Informations complémentaires</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {details.map((detail) => (
                <div key={detail.label} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">{detail.label}</p>
                  <p className="text-sm font-medium text-slate-800">{detail.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {(notification.actions || []).length ? (
          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            {notification.actions.map((action) => (
              <Button
                key={action.key}
                size="sm"
                variant={action.variant === 'outline' ? 'outline' : 'primary'}
                onClick={() => handleAction(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}

        {!notification.isRead ? (
          <Button variant="outline" className="w-full" onClick={handleMarkRead}>
            Marquer comme lue
          </Button>
        ) : null}
      </div>
    </Modal>
  );
}

export default NotificationDetailModal;
