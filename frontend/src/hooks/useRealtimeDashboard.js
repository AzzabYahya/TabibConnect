import { useEffect } from 'react';
import { io } from 'socket.io-client';

import { getStoredAccessToken } from '../lib/session';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const socketUrl = apiUrl.replace(/\/api\/?$/, '');

function useRealtimeDashboard({ onNotification, onDoctorPending, onPatientStatus }) {
  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      return undefined;
    }

    const socket = io(socketUrl, {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('notification:new', (payload) => {
      onNotification?.(payload);
      if (payload?.type === 'SYSTEME' || payload?.type === 'RDV_CONFIRME') {
        onDoctorPending?.(payload);
        onPatientStatus?.(payload);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [onNotification, onDoctorPending, onPatientStatus]);
}

export default useRealtimeDashboard;
