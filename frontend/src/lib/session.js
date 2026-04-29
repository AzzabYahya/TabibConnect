const ACCESS_TOKEN_KEY = 'tabibconnect_access_token';
const USER_KEY = 'tabibconnect_user';
const CSRF_TOKEN_KEY = 'tabibconnect_csrf_token';
const SESSION_CHANGE_EVENT = 'tabibconnect:session-changed';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const getStoredAccessToken = () => {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getStoredUser = () => {
  if (!isBrowser()) {
    return null;
  }

  const rawUser = window.localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

export const getStoredCsrfToken = () => {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(CSRF_TOKEN_KEY);
};

export const storeSession = ({ accessToken, user }) => {
  if (!isBrowser()) {
    return;
  }

  if (accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
};

export const storeCsrfToken = (csrfToken) => {
  if (!isBrowser() || !csrfToken) {
    return;
  }

  window.localStorage.setItem(CSRF_TOKEN_KEY, csrfToken);
};

export const clearSession = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
};

export const clearCsrfToken = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(CSRF_TOKEN_KEY);
};
