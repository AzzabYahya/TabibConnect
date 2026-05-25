import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, Clock, Users, Building2, BarChart3, Star, UserCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import DashboardShell from './DashboardShell';

function DoctorDashboardLayout() {
  const { t } = useTranslation();
  const [showAdminMessage, setShowAdminMessage] = useState(true);

  const tabs = [
    { to: '/dashboard/doctor', label: t('dashboard.doctorTabs.agenda'), icon: CalendarDays, end: true },
    { to: '/dashboard/doctor/availability', label: t('dashboard.doctorTabs.availability'), icon: Clock },
    { to: '/dashboard/doctor/patients', label: t('dashboard.doctorTabs.patients'), icon: Users },
    { to: '/dashboard/doctor/profile', label: t('dashboard.doctorTabs.profile'), icon: Building2 },
    { to: '/dashboard/doctor/stats', label: t('dashboard.doctorTabs.stats'), icon: BarChart3 },
    { to: '/dashboard/doctor/reviews', label: t('dashboard.doctorTabs.reviews'), icon: Star },
    { to: '/dashboard/doctor/account', label: 'Mon compte', icon: UserCircle },
  ];

  return (
    <DashboardShell subtitle={t('dashboard.doctorSubtitle')}>
      {showAdminMessage && (
        <div className="group relative mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3.5 pr-12 text-sm text-amber-900 shadow-sm backdrop-blur-sm transition-all hover:bg-amber-100/50">
          <div className="mt-0.5 rounded-lg bg-amber-100 p-1.5 text-amber-600">
            <Star size={16} />
          </div>
          <div>
            <p className="font-bold text-amber-900">Message de l'administration</p>
            <p className="mt-1 text-amber-800/80 leading-relaxed">
              La photo de profil médecin est obligatoire. Toute nouvelle photo doit être validée par l'admin avant d'apparaître sur votre profil public.
            </p>
          </div>
          <button
            onClick={() => setShowAdminMessage(false)}
            className="absolute right-3 top-3 rounded-xl p-1.5 text-amber-400 hover:bg-amber-200/50 hover:text-amber-600 transition-colors"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="sticky top-0 z-10 mb-6 overflow-x-auto rounded-2xl bg-white/80 p-2 shadow-sm backdrop-blur-md border border-slate-200/60">
        <div className="flex gap-1.5">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-med-primary text-white shadow-lg shadow-med-primary/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                  {tab.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
      <Outlet />
    </DashboardShell>
  );
}

export default DoctorDashboardLayout;
