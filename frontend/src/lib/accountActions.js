import api from './api';
import { clearCsrfToken, clearSession, storeCsrfToken } from './session';

export const fetchCsrfToken = async () => {
  const response = await api.get('/auth/csrf-token');
  const csrfToken = response.data?.csrfToken || '';

  if (csrfToken) {
    storeCsrfToken(csrfToken);
  }

  return csrfToken;
};

export const logoutCurrentUser = async () => {
  await fetchCsrfToken();
  await api.post('/auth/logout');
  clearSession();
  clearCsrfToken();
};

export const deleteCurrentUserAccount = async ({ reason, reasonDetail, acceptDeletionTerms }) => {
  await fetchCsrfToken();

  await api.delete('/auth/me', {
    data: {
      reason,
      reasonDetail,
      acceptDeletionTerms,
    },
  });

  clearSession();
  clearCsrfToken();
};