import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { getStoredAccessToken } from '../lib/session';

let socket = null;

const getSocket = () => {
  if (!socket) {
    const token = getStoredAccessToken();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    socket = io(apiUrl, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
  }
  return socket;
};

export const useNotificationSocket = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const notificationSocket = getSocket();

    const handleNewNotification = (notification) => {
      // Invalidate several notification-related queries so all UI parts refresh
      // including the unread count shown in the top-bar and dashboards.
      const keys = [
        ['notifications-unread-count'],
        ['notifications-list'],
        ['patient-notifications'],
        ['patient-dashboard-core'],
        ['admin-notifications'],
        ['doctor-dashboard-core'],
        ['notifications'],
      ];

      keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));

      // Also show toast or some indicator if needed
      console.log('New notification received:', notification);
    };

    const handleConnect = () => {
      console.log('Socket.io connected');
    };

    const handleDisconnect = () => {
      console.log('Socket.io disconnected');
    };

    notificationSocket.on('notification:new', handleNewNotification);
    notificationSocket.on('connect', handleConnect);
    notificationSocket.on('disconnect', handleDisconnect);

    return () => {
      notificationSocket.off('notification:new', handleNewNotification);
      notificationSocket.off('connect', handleConnect);
      notificationSocket.off('disconnect', handleDisconnect);
    };
  }, [queryClient]);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
