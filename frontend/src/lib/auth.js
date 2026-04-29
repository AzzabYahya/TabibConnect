import { getStoredAccessToken, getStoredUser } from './session';

export const dashboardRouteByRole = {
  PATIENT: '/dashboard/patient',
  DOCTOR: '/dashboard/doctor',
  ADMIN: '/dashboard/admin',
};

export const getCurrentSession = () => {
  const accessToken = getStoredAccessToken();
  const user = getStoredUser();

  return {
    accessToken,
    user,
    isAuthenticated: Boolean(accessToken && user),
    role: user?.role || null,
  };
};

export const normalizeRedirectPath = (value) => {
  const redirectValue = String(value || '').trim();

  if (!redirectValue || !redirectValue.startsWith('/')) {
    return null;
  }

  return redirectValue;
};

export const createRedirectSearch = (redirectPath) => {
  const normalizedPath = normalizeRedirectPath(redirectPath);

  if (!normalizedPath) {
    return '';
  }

  const params = new URLSearchParams();
  params.set('redirect', normalizedPath);

  return `?${params.toString()}`;
};
