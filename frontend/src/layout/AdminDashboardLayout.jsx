import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity,
  Bell,
  LayoutDashboard,
  MessageSquareWarning,
  HeartPulse,
  Stethoscope,
  Users,
  BadgeCheck,
  BarChart3,
  FileText,
  UserCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import DashboardShell from './DashboardShell';
import { useNotificationSocket } from '../hooks/useNotificationSocket';

function AdminDashboardLayout() {
  const { t } = useTranslation();
  useNotificationSocket();
  const links = [
    { to: '/dashboard/admin', label: t('dashboard.adminMenu.overview'), icon: LayoutDashboard, end: true },
    { to: '/dashboard/admin/requests', label: 'Demandes', icon: FileText },
    { to: '/dashboard/admin/patients', label: 'Patients', icon: HeartPulse },
    { to: '/dashboard/admin/doctors', label: t('dashboard.adminMenu.doctors'), icon: Stethoscope },
    { to: '/dashboard/admin/users', label: t('dashboard.adminMenu.users'), icon: Users },
    { to: '/dashboard/admin/reviews', label: t('dashboard.adminMenu.pendingReviews'), icon: BadgeCheck },
    { to: '/dashboard/admin/metrics', label: t('dashboard.adminMenu.metrics'), icon: BarChart3 },
    { to: '/dashboard/admin/logs', label: t('dashboard.adminMenu.logs'), icon: Activity },
    { to: '/dashboard/admin/notifications', label: t('dashboard.adminMenu.notifications'), icon: Bell },
    { to: '/dashboard/admin/appointments', label: 'Rendez-vous', icon: FileText },
    { to: '/dashboard/admin/account', label: 'Mon compte', icon: UserCircle },
  ];


  return (
    <DashboardShell subtitle={t('dashboard.adminSubtitle')}>
      <div className="grid min-h-[calc(100vh-230px)] grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="sticky top-4 h-[calc(100vh-260px)] rounded-2xl bg-[#0F1923] p-4 text-white">
          <div className="flex items-center gap-2">
            <MessageSquareWarning size={16} className="text-white/80" />
            <p className="text-sm font-bold">TabibConnect</p>
          </div>
          <p className="mb-4 mt-2 text-xs text-white/70">{t('common.administrator')}</p>
          <div className="space-y-2">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `block rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`
                }
              >
                <span className="flex items-center gap-2">
                  <item.icon size={16} className="text-white/80" />
                  {item.label}
                </span>
              </NavLink>
            ))}
          </div>
        </aside>
        <section className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
          <Outlet />
        </section>
      </div>
    </DashboardShell>
  );
}

export default AdminDashboardLayout;
