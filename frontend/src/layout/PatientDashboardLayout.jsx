import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import DashboardShell from './DashboardShell';

function PatientDashboardLayout() {
  const { t } = useTranslation();
  const tabs = [
    { to: '/dashboard/patient', label: t('common.dashboard', 'Tableau de bord'), icon: LayoutDashboard, end: true },
    { to: '/dashboard/patient/profile', label: t('common.profile', 'Mon profil'), icon: User },
  ];

  return (
    <DashboardShell subtitle={t('dashboard.patientSubtitle')}>
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

export default PatientDashboardLayout;
