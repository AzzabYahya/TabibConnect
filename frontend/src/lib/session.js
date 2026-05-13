const ACCESS_TOKEN_KEY = 'tabibconnect_access_token';
const USER_KEY = 'tabibconnect_user';
const SESSION_CHANGE_EVENT = 'tabibconnect:session-changed';
let inMemoryCsrfToken = null;

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const getStoredAccessToken = () => {
  if (!isBrowser()) {
    return null;
  }
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
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
  return inMemoryCsrfToken;
};

export const storeSession = ({ accessToken, user }) => {
  if (isBrowser()) {
    if (accessToken) {
      window.sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    }

    if (user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
};

export const storeCsrfToken = (csrfToken) => {
  inMemoryCsrfToken = csrfToken;
};

export const clearSession = () => {
  if (isBrowser()) {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }

  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
};



export const clearCsrfToken = () => {
  inMemoryCsrfToken = null;
};
