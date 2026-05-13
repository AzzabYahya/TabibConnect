import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import router from './router';
import api from './lib/api';
import { getStoredAccessToken, getStoredUser } from './lib/session';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      const user = getStoredUser();

      // If we have a user profile in localStorage, always try to validate it
      // This will trigger the refresh token flow in api.js if the accessToken is missing or expired
      if (user) {
        try {
          await api.get('/auth/me');
        } catch (err) {
          console.warn('Session recovery failed or no valid refresh token:', err);
        }
      }
      setIsInitializing(false);
    };

    initSession();
  }, []);


  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="space-y-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-med-primary border-t-transparent mx-auto" />
          <p className="text-sm font-medium text-slate-600">Récupération de la session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: {
            borderRadius: '12px',
            border: '1px solid rgba(26, 107, 138, 0.15)',
          },
        }}
      />
    </>
  );
}

export default App;

