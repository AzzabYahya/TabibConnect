import {
  Bird,
  BriefcaseBusiness,
  Camera,
  HeartPulse,
  LayoutDashboard,
  LogIn,
  LogOut,
  Settings,
  Stethoscope,
  UserRoundPlus,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { dashboardRouteByRole, getCurrentSession } from '../lib/auth';
import { logoutCurrentUser } from '../lib/accountActions';

const headerActionClassName =
  'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

function AppShell() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const session = getCurrentSession();
  const dashboardPath = session.user?.role ? dashboardRouteByRole[session.user.role] : null;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isSearchRoute = location.pathname.startsWith('/search');
  const isDashboardRoute = location.pathname.startsWith('/dashboard/');

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = 'ltr';
  }, [i18n.language]);

  const navItems = [
    { to: '/', label: t('nav.home') },
    { to: '/search', label: t('nav.search') },
  ];

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutCurrentUser();
      toast.success('Déconnexion réussie.');
      navigate('/');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible de se déconnecter pour le moment.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-medical-pattern opacity-75" />
      <div className="pointer-events-none absolute -top-48 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-med-secondary/30 blur-3xl" />

      <header className="relative z-10 border-b border-white/50 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-8">
          <NavLink to="/" className="flex items-center gap-2 text-med-primary">
            <Stethoscope className="h-6 w-6" />
            <span className="text-lg font-bold tracking-tight">{t('appName')}</span>
          </NavLink>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-med-primary text-white shadow-lg shadow-med-primary/25' : 'text-slate-700 hover:bg-med-primary/10'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!session.isAuthenticated ? (
              <>
                <Link to="/connexion" className={`${headerActionClassName} border border-med-primary/30 bg-white/80 text-med-primary hover:bg-med-primary/10`}>
                  <LogIn size={16} />
                  {t('nav.login')}
                </Link>
                <Link to="/inscription" className={`${headerActionClassName} bg-med-primary text-white shadow-lg shadow-med-primary/20 hover:-translate-y-0.5 hover:bg-med-primary/90`}>
                  <UserRoundPlus size={16} />
                  {t('nav.register')}
                </Link>
              </>
            ) : (
              <>
                {!isDashboardRoute && dashboardPath ? (
                  <Link to={dashboardPath} className={`${headerActionClassName} bg-med-primary text-white shadow-lg shadow-med-primary/20 hover:-translate-y-0.5 hover:bg-med-primary/90`}>
                    <LayoutDashboard size={16} />
                    {t('common.mySpace')}
                  </Link>
                ) : null}
                {!isDashboardRoute ? (
                  <>
                    <Link to="/settings" className={`${headerActionClassName} border border-slate-300 bg-white/80 text-slate-700 hover:border-slate-400 hover:bg-slate-100`}>
                      <Settings size={16} />
                      {t('common.settings')}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className={`${headerActionClassName} border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 disabled:cursor-wait disabled:opacity-70`}
                    >
                      <LogOut size={16} />
                      {isLoggingOut ? t('common.logoutLoading') : t('common.logout')}
                    </button>
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      </header>

      <main className={isDashboardRoute ? 'relative z-10 flex-1 min-h-0 w-full px-0 py-0' : isSearchRoute ? 'relative z-10 flex-1 min-h-0 w-full px-0 py-0' : 'relative z-10 mx-auto w-full max-w-7xl flex-1 min-h-0 px-4 py-8 md:px-8 md:py-10'}>
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-[#0F1923] text-slate-200">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8">
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <Stethoscope className="h-6 w-6" />
                <span className="text-lg font-bold tracking-tight">{t('appName')}</span>
              </div>
              <p className="max-w-sm text-sm leading-6 text-slate-300">{t('appShell.platformTagline')}</p>
              <div className="flex items-center gap-3 text-slate-300">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/8">
                  <Camera size={16} />
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/8">
                  <BriefcaseBusiness size={16} />
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/8">
                  <Bird size={16} />
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">{t('appShell.navigation')}</p>
              <div className="flex flex-col gap-2 text-sm text-slate-300">
                {navItems.map((item) => (
                  <Link key={item.to} to={item.to} className="transition hover:text-white">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">{t('appShell.quickSpecialties')}</p>
              <div className="flex flex-col gap-2 text-sm text-slate-300">
                {['Cardiologie', 'Neurologie', 'Pédiatrie', 'Dermatologie', 'Orthopédie'].map((item) => (
                  <Link key={item} to={`/search?specialite=${encodeURIComponent(item)}`} className="transition hover:text-white">
                    {item}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">{t('appShell.contactLegal')}</p>
              <div className="space-y-2 text-sm text-slate-300">
                <p>{t('appShell.support')}</p>
                <a href="mailto:contact@tabibconnect.ma" className="block transition hover:text-white">
                  contact@tabibconnect.ma
                </a>
                <p>{t('appShell.privacy')}</p>
                <p>{t('appShell.rights')}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-4 text-xs text-slate-400">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>{t('appShell.legalLine')}</p>
              <p className="inline-flex items-center gap-1">
                <HeartPulse size={14} className="text-med-secondary" />
                {t('appShell.secureCare')}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppShell;