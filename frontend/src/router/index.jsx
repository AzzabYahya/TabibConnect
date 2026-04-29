import { createElement, lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import AppShell from '../layout/AppShell';
import PrivateRoute from '../components/common/PrivateRoute';
import AppointmentDetailPage from '../pages/AppointmentDetailPage';
import AdminAccountDetailPage from '../pages/AdminAccountDetailPage';
import DoctorProfilePage from '../pages/DoctorProfilePage';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import RegisterPage from '../pages/RegisterPage';
import SettingsPage from '../pages/SettingsPage';

const searchPageLoader = lazy(() => import('../pages/SearchPage'));
const dashboardPatientPageLoader = lazy(() => import('../pages/DashboardPatientPage'));
const dashboardDoctorPageLoader = lazy(() => import('../pages/DashboardDoctorPage'));
const dashboardAdminPageLoader = lazy(() => import('../pages/DashboardAdminPage'));

const withRouteSuspense = (element) => (
  <Suspense
    fallback={
      <div className="rounded-2xl border border-white/40 bg-white/80 p-5 text-sm text-slate-600 shadow-xl shadow-med-primary/10 backdrop-blur">
        Chargement de la page...
      </div>
    }
  >
    {element}
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'search',
        element: withRouteSuspense(createElement(searchPageLoader)),
      },
      {
        path: 'doctor/:id',
        element: <DoctorProfilePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'connexion',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'inscription',
        element: <RegisterPage />,
      },
      {
        path: 'settings',
        element: (
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'dashboard/patient',
        element: (
          <PrivateRoute
            role="PATIENT"
            title="Continuez votre réservation"
            subtitle="Créez un compte ou connectez-vous pour consulter votre espace patient."
          >
            {withRouteSuspense(createElement(dashboardPatientPageLoader))}
          </PrivateRoute>
        ),
      },
      {
        path: 'dashboard/doctor',
        element: (
          <PrivateRoute
            role="DOCTOR"
            title="Continuez votre réservation"
            subtitle="Créez un compte ou connectez-vous pour consulter votre espace médecin."
          >
            {withRouteSuspense(createElement(dashboardDoctorPageLoader))}
          </PrivateRoute>
        ),
      },
      {
        path: 'dashboard/admin',
        element: (
          <PrivateRoute
            role="ADMIN"
            title="Continuez votre réservation"
            subtitle="Créez un compte ou connectez-vous pour consulter votre espace administrateur."
          >
            {withRouteSuspense(createElement(dashboardAdminPageLoader))}
          </PrivateRoute>
        ),
      },
      {
        path: 'dashboard/admin/accounts/:userId',
        element: (
          <PrivateRoute
            role="ADMIN"
            title="Continuez votre réservation"
            subtitle="Créez un compte ou connectez-vous pour consulter votre espace administrateur."
          >
            <AdminAccountDetailPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'appointment/:id',
        element: <AppointmentDetailPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;
