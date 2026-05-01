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
import PaymentSuccessPage from '../pages/PaymentSuccessPage';
import PaymentCancelPage from '../pages/PaymentCancelPage';
import AdminDashboardLayout from '../layout/AdminDashboardLayout';
import DoctorDashboardLayout from '../layout/DoctorDashboardLayout';
import PatientDashboardLayout from '../layout/PatientDashboardLayout';

const searchPageLoader = lazy(() => import('../pages/SearchPage'));
const dashboardPatientPageLoader = lazy(() => import('../pages/DashboardPatientPage'));
const adminOverviewPageLoader = lazy(() => import('../pages/AdminOverviewPage'));
const adminUsersPageLoader = lazy(() => import('../pages/AdminUsersPage'));
const adminDoctorsPageLoader = lazy(() => import('../pages/AdminDoctorsPage'));
const adminReviewsPageLoader = lazy(() => import('../pages/AdminReviewsPage'));
const adminMetricsPageLoader = lazy(() => import('../pages/AdminMetricsPage'));
const adminLogsPageLoader = lazy(() => import('../pages/AdminLogsPage'));
const adminNotificationsPageLoader = lazy(() => import('../pages/AdminNotificationsPage'));

const doctorAgendaPageLoader = lazy(() => import('../pages/DoctorAgendaPage'));
const doctorAvailabilityPageLoader = lazy(() => import('../pages/DoctorAvailabilityPage'));
const doctorPatientsPageLoader = lazy(() => import('../pages/DoctorPatientsPage'));
const doctorProfileCabinetPageLoader = lazy(() => import('../pages/DoctorProfileCabinetPage'));
const doctorStatsPageLoader = lazy(() => import('../pages/DoctorStatsPage'));
const doctorReviewsPageLoader = lazy(() => import('../pages/DoctorReviewsPage'));

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
            <PatientDashboardLayout />
          </PrivateRoute>
        ),
        children: [
          { index: true, element: withRouteSuspense(createElement(dashboardPatientPageLoader)) },
        ],
      },
      {
        path: 'dashboard/doctor',
        element: (
          <PrivateRoute
            role="DOCTOR"
            title="Continuez votre réservation"
            subtitle="Créez un compte ou connectez-vous pour consulter votre espace médecin."
          >
            <DoctorDashboardLayout />
          </PrivateRoute>
        ),
        children: [
          { index: true, element: withRouteSuspense(createElement(doctorAgendaPageLoader)) },
          { path: 'availability', element: withRouteSuspense(createElement(doctorAvailabilityPageLoader)) },
          { path: 'patients', element: withRouteSuspense(createElement(doctorPatientsPageLoader)) },
          { path: 'profile', element: withRouteSuspense(createElement(doctorProfileCabinetPageLoader)) },
          { path: 'stats', element: withRouteSuspense(createElement(doctorStatsPageLoader)) },
          { path: 'reviews', element: withRouteSuspense(createElement(doctorReviewsPageLoader)) },
        ],
      },
      {
        path: 'dashboard/admin',
        element: (
          <PrivateRoute
            role="ADMIN"
            title="Continuez votre réservation"
            subtitle="Créez un compte ou connectez-vous pour consulter votre espace administrateur."
          >
            <AdminDashboardLayout />
          </PrivateRoute>
        ),
        children: [
          {
            index: true,
            element: withRouteSuspense(createElement(adminOverviewPageLoader)),
          },
          {
            path: 'users',
            element: withRouteSuspense(createElement(adminUsersPageLoader)),
          },
          {
            path: 'doctors',
            element: withRouteSuspense(createElement(adminDoctorsPageLoader)),
          },
          {
            path: 'reviews',
            element: withRouteSuspense(createElement(adminReviewsPageLoader)),
          },
          {
            path: 'metrics',
            element: withRouteSuspense(createElement(adminMetricsPageLoader)),
          },
          {
            path: 'logs',
            element: withRouteSuspense(createElement(adminLogsPageLoader)),
          },
          {
            path: 'notifications',
            element: withRouteSuspense(createElement(adminNotificationsPageLoader)),
          },
        ],
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
        path: 'payment/success',
        element: <PaymentSuccessPage />,
      },
      {
        path: 'payment/cancel',
        element: <PaymentCancelPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

export default router;
