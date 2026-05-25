import { Navigate } from 'react-router-dom';

import { dashboardRouteByRole, getCurrentSession } from '../lib/auth';

const accountPathByRole = {
  PATIENT: '/dashboard/patient/profile',
  DOCTOR: '/dashboard/doctor/account',
  ADMIN: '/dashboard/admin/account',
};

function SettingsRedirectPage() {
  const role = getCurrentSession().user?.role;
  const target = accountPathByRole[role] || dashboardRouteByRole[role] || '/';
  return <Navigate to={target} replace />;
}

export default SettingsRedirectPage;
