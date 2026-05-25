import { ChevronRight } from 'lucide-react';

import Badge from '../ui/Badge';
import { categoryBadgeVariant, getCategoryIcon, truncateText } from '../../lib/notifications';

function NotificationItem({ notification, onClick }) {
  const Icon = getCategoryIcon(notification.category);

  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:bg-slate-100 ${
        notification.isRead ? 'border-slate-100 bg-slate-50' : 'border-blue-100 bg-white shadow-sm'
      }`}
    >
      <div
        className={`mt-0.5 rounded-full p-1.5 ${
          !notification.isRead ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={categoryBadgeVariant[notification.category] || 'neutral'}>
            {notification.label}
          </Badge>
          {!notification.isRead ? <span className="h-2 w-2 rounded-full bg-red-500" /> : null}
          <p className="ml-auto text-[10px] font-medium text-slate-400">{notification.time}</p>
        </div>
        <p className={`mt-1 text-sm font-semibold ${!notification.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
          {notification.title}
        </p>
        <p className="mt-0.5 text-sm text-slate-600">{truncateText(notification.body, 100)}</p>
      </div>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}

export default NotificationItem;
