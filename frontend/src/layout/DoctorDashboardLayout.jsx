import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, Clock, Users, Building2, BarChart3, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import DashboardShell from './DashboardShell';

function DoctorDashboardLayout() {
  const { t } = useTranslation();
  const tabs = [
    { to: '/dashboard/doctor', label: t('dashboard.doctorTabs.agenda'), icon: CalendarDays, end: true },
    { to: '/dashboard/doctor/availability', label: t('dashboard.doctorTabs.availability'), icon: Clock },
    { to: '/dashboard/doctor/patients', label: t('dashboard.doctorTabs.patients'), icon: Users },
    { to: '/dashboard/doctor/profile', label: t('dashboard.doctorTabs.profile'), icon: Building2 },
    { to: '/dashboard/doctor/stats', label: t('dashboard.doctorTabs.stats'), icon: BarChart3 },
    { to: '/dashboard/doctor/reviews', label: t('dashboard.doctorTabs.reviews'), icon: Star },
  ];

  return (
    <DashboardShell subtitle={t('dashboard.doctorSubtitle')}>
      <div className="sticky top-0 z-10 mb-4 overflow-x-auto rounded-2xl bg-white p-2 shadow">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `whitespace-nowrap rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-med-primary text-white' : 'bg-slate-100 text-slate-700'}`}>
              <span className="inline-flex items-center gap-2">
                <tab.icon size={16} />
                {tab.label}
              </span>
            </NavLink>
          ))}
        </div>
      </div>
      <Outlet />
    </DashboardShell>
  );
}

export default DoctorDashboardLayout;
