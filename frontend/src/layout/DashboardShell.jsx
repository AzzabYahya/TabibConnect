import { Bell, LogOut } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
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
    queryKey: ['notifications-list', isNotifOpen, notifPage],
    queryFn: async () => {
      const response = await api.get('/notifications', { params: { page: notifPage, limit: 20 } });
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
      <div className="relative h-40 overflow-hidden rounded-b-2xl">
        <MedicalHeroAnimation />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,25,35,0.65)] to-[rgba(0,0,0,0)]" />
        <div className="absolute left-6 top-4 text-white md:top-5">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-white/90">{subtitle}</p>
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
          {notificationsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (notificationsQuery.data?.items || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              <Bell className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-600">Aucune notification</p>
            </div>
          ) : (
            <div className="max-h-[65vh] space-y-2 overflow-y-auto">
              {(notificationsQuery.data?.items || []).map((n) => (
                <Card
                  key={n.id}
                  className={`p-3 ${!n.isRead ? 'border-l-2 border-l-blue-500 bg-blue-50' : 'bg-slate-50'}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{n.type}</p>
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{n.message}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(n.createdAt).toLocaleDateString('fr-MA', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </Card>
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
    </div>
  );
}

export default DashboardShell;
