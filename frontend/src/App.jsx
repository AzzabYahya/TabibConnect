import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import router from './router';

function App() {
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
