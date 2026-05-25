import { Bell, LogOut } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import NotificationCategoryFilter from '../components/notifications/NotificationCategoryFilter';
import NotificationDetailModal from '../components/notifications/NotificationDetailModal';
import NotificationItem from '../components/notifications/NotificationItem';
import { getCurrentSession } from '../lib/auth';
import { logoutCurrentUser } from '../lib/accountActions';
import api from '../lib/api';
import useRealtimeDashboard from '../hooks/useRealtimeDashboard';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import MedicalHeroAnimation from '../components/common/MedicalHeroAnimation';

function DashboardShell({ subtitle, children }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = getCurrentSession();
  const user = session.user || {};
  const role = user.role || 'PATIENT';
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifPage, setNotifPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['dashboard-shell-profile', role],
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (role === 'DOCTOR') {
        const res = await api.get('/dashboard/doctor');
        return { name: res.data?.data?.doctor?.name || null };
      }
      if (role === 'PATIENT') {
        const res = await api.get('/dashboard/patient');
        return { name: res.data?.data?.patient?.displayName || null };
      }
      return { name: null };
    },
  });

  const resolvedName = useMemo(() => {
    const source = String(profileQuery.data?.name || user.nomComplet || user.email || 'Utilisateur');
    const noEmail = source.includes('@') ? source.split('@')[0] : source;
    const normalized = noEmail.replace(/^(dr\.?|docteur)\s+/i, '').trim();
    return normalized || 'Utilisateur';
  }, [profileQuery.data?.name, user]);

  useNotificationSocket();
  const firstName = useMemo(() => resolvedName.split(/[.\s_-]+/)[0] || 'Utilisateur', [resolvedName]);

  const title = role === 'DOCTOR' ? t('dashboard.helloDoctor', { name: resolvedName }) : t('dashboard.helloUser', { name: firstName });
  const roleLabel = role === 'ADMIN' ? t('common.administrator') : role === 'DOCTOR' ? t('common.doctor') : t('common.patient');

  const unreadQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    staleTime: 10 * 1000,
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count');
      return response.data?.data?.count || 0;
    },
  });

  const notificationsQuery = useQuery({
    enabled: isNotifOpen,
    queryKey: ['notifications-list', isNotifOpen, notifPage, categoryFilter],
    queryFn: async () => {
      const params = { page: notifPage, limit: 20 };
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      const response = await api.get('/notifications', { params });
      return response.data?.data;
    },
  });

  useRealtimeDashboard({
    onNotification: () => {
      unreadQuery.refetch();
      if (isNotifOpen) {
        notificationsQuery.refetch();
      }
    },
  });

  const markReadAll = async () => {
    await api.post('/notifications/mark-read');
    await unreadQuery.refetch();
    await notificationsQuery.refetch();
    queryClient.invalidateQueries({ queryKey: ['patient-notifications'] });
  };

  const markReadOne = async (id) => {
    await api.post('/notifications/mark-read', { ids: [id] });
    await unreadQuery.refetch();
    await notificationsQuery.refetch();
    queryClient.invalidateQueries({ queryKey: ['patient-notifications'] });
    setSelectedNotification((current) => (current?.id === id ? { ...current, isRead: true } : current));
  };

  const openNotification = async (notification) => {
    setSelectedNotification(notification);
    if (!notification.isRead) {
      await markReadOne(notification.id);
    }
  };

  const onCategoryChange = (value) => {
    setCategoryFilter(value);
    setNotifPage(1);
  };

  const onLogout = async () => {
    try {
      await logoutCurrentUser();
      toast.success('Déconnexion réussie.');
      navigate('/');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Déconnexion impossible.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="relative h-44 overflow-hidden w-full">
        <MedicalHeroAnimation />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,20,30,0.7)] via-[rgba(10,20,30,0.25)] to-transparent" />
        <div className="absolute left-6 bottom-5 text-white md:left-8">
          <h1 className="text-2xl font-bold drop-shadow-lg">{title}</h1>
          <p className="mt-0.5 text-sm font-medium text-white/85 drop-shadow">{subtitle}</p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar name={resolvedName} />
            <div>
              <p className="text-sm font-semibold text-slate-900">{resolvedName}</p>
              <p className="text-xs text-slate-600">{roleLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNotifPage(1);
                setIsNotifOpen(true);
              }}
              className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Bell size={16} />
              {t('common.notifications')}
              {unreadQuery.data > 0 ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
            </button>
            <Button size="sm" variant="outline" className="gap-2" onClick={onLogout}>
              <LogOut size={14} /> {t('common.logout')}
            </Button>
          </div>
        </div>
        {children || <Outlet />}
      </div>

      <Modal isOpen={isNotifOpen} title={t('common.notifications')} onClose={() => setIsNotifOpen(false)}>
        <div className="space-y-4">
          <NotificationCategoryFilter value={categoryFilter} onChange={onCategoryChange} />
          {notificationsQuery.isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <div className="rounded-full bg-red-50 p-3 text-red-500">
                <Bell size={24} />
              </div>
              <p className="text-sm font-medium text-slate-900">{t('common.error')}</p>
              <p className="text-xs text-slate-500">{t('dashboardShell.notificationError', 'Impossible de charger les notifications.')}</p>
              <Button size="sm" variant="outline" onClick={() => notificationsQuery.refetch()} className="mt-2">
                {t('common.retry', 'Réessayer')}
              </Button>
            </div>
          ) : notificationsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (notificationsQuery.data?.items || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="rounded-full bg-slate-50 p-4 text-slate-300">
                <Bell size={32} />
              </div>
              <p className="text-sm font-medium text-slate-600">
                {t('dashboardShell.noNotifications', 'Aucune notification')}
              </p>
            </div>
          ) : (
            <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
              {(notificationsQuery.data?.items || []).map((n) => (
                <NotificationItem key={n.id} notification={n} onClick={openNotification} />
              ))}
            </div>
          )}

          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={notificationsQuery.isLoading || !notificationsQuery.data?.pagination?.hasPrevPage}
                onClick={() => setNotifPage((p) => Math.max(1, p - 1))}
              >
                ← Précédent
              </Button>
              <span className="text-xs text-slate-600">
                Page {notificationsQuery.data?.pagination?.page || 1} / {notificationsQuery.data?.pagination?.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={notificationsQuery.isLoading || !notificationsQuery.data?.pagination?.hasNextPage}
                onClick={() => setNotifPage((p) => p + 1)}
              >
                Suivant →
              </Button>
            </div>
          </div>

          <Button onClick={() => markReadAll().catch(() => {})} className="w-full">
            {t('notifications.markAllRead', 'Tout marquer comme lu')}
          </Button>
        </div>
      </Modal>

      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        onMarkRead={markReadOne}
      />
    </div>
  );
}

export default DashboardShell;
