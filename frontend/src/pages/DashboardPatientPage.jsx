import { useMutation, useQuery } from '@tanstack/react-query';
import { MapPin, AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import useRealtimeDashboard from '../hooks/useRealtimeDashboard';
import { useNotificationSocket } from '../hooks/useNotificationSocket';

const statusColor = {
  EN_ATTENTE: 'warning',
  CONFIRME: 'success',
  COMPLETE: 'info',
  ANNULE: 'neutral',
  NO_SHOW: 'warning',
};

const notificationTone = {
  RDV_CONFIRME: 'success',
  RAPPEL_RDV: 'info',
  PAIEMENT_RECU: 'warning',
  RDV_ANNULE: 'warning',
  SYSTEME: 'neutral',
};

function DashboardPatientPage() {
  const navigate = useNavigate();
  useNotificationSocket();
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStatus, setHistoryStatus] = useState('ALL');
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [isProfileRequestOpen, setIsProfileRequestOpen] = useState(false);
  const [profileReason, setProfileReason] = useState('');
  const [profileForm, setProfileForm] = useState({ adresse: '', ville: '', groupeSanguin: '', antecedents: '' });

  const dashboardQuery = useQuery({
    queryKey: ['patient-dashboard-core'],
    queryFn: async () => {
      const response = await api.get('/dashboard/patient');
      return response.data?.data;
    },
  });

  const historyQuery = useQuery({
    queryKey: ['patient-history', historyPage, historyStatus],
    queryFn: async () => {
      const response = await api.get('/dashboard/patient/history', { params: { page: historyPage, limit: 20, status: historyStatus } });
      return response.data?.data;
    },
  });

  const recurringQuery = useQuery({
    queryKey: ['patient-recurring-doctors'],
    queryFn: async () => {
      const response = await api.get('/dashboard/patient/recurring-doctors');
      return response.data?.data;
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ['patient-notifications', notificationsPage],
    queryFn: async () => {
      const response = await api.get('/dashboard/patient/notifications', { params: { page: notificationsPage, limit: 20 } });
      return response.data?.data;
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.post('/dashboard/patient/notifications/mark-read'),
    onSuccess: async () => {
      toast.success('Tout marqué comme lu.');
      await notificationsQuery.refetch();
      await dashboardQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Action impossible.'),
  });

  const submitProfileRequest = useMutation({
    mutationFn: async () =>
      api.post('/dashboard/patient/change-requests', {
        reason: profileReason,
        data: {
          adresse: profileForm.adresse,
          ville: profileForm.ville,
          groupeSanguin: profileForm.groupeSanguin || null,
          antecedents: profileForm.antecedents || null,
        },
      }),
    onSuccess: async () => {
      toast.success('Demande envoyée à l’admin.');
      setIsProfileRequestOpen(false);
      setProfileReason('');
      await dashboardQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Envoi impossible.'),
  });

  useRealtimeDashboard({
    onNotification: async () => {
      await notificationsQuery.refetch();
      await dashboardQuery.refetch();
    },
    onPatientStatus: async () => {
      await dashboardQuery.refetch();
      await historyQuery.refetch();
    },
  });

  const dashboard = dashboardQuery.data || {};
  const profile = dashboard.patient || {};
  const medical = dashboard.medicalProfile || {};
  const upcoming = dashboard.upcomingAppointment || null;

  const historyItems = historyQuery.data?.items || [];
  const historyPagination = historyQuery.data?.pagination;
  const recurringDoctors = recurringQuery.data || [];
  const notifications = notificationsQuery.data?.items || [];
  const notificationsPagination = notificationsQuery.data?.pagination;

  const unreadBadge = useMemo(() => (dashboard.summary?.unreadNotifications || 0) > 0, [dashboard.summary]);

  const warnings = medical.warnings || 0;

  return (
    <div className="space-y-6">
      {warnings > 0 && (
        <Card className={`border-none shadow-sm ${warnings >= 2 ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'}`}>
          <div className="flex items-center gap-3 p-1">
            <AlertTriangle className={`h-6 w-6 ${warnings >= 2 ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="flex-1">
              <p className="text-sm font-bold">
                {warnings >= 2 ? 'Action Requise : Compte en sursis' : 'Attention : Fiabilité en baisse'}
              </p>
              <p className="text-xs opacity-80">
                Vous avez {warnings} avertissement(s). Pour éviter des restrictions, veillez à honorer vos prochains rendez-vous ou à annuler au moins 24h à l'avance.
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate('/profile')} className="text-xs font-bold uppercase underline">
              Voir mon score
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <Card className="space-y-4 border-med-primary/20 bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Prochain RDV</p>
              <p className="text-sm text-slate-600">Données BDD</p>
            </div>
            {upcoming ? (
              <Badge variant={statusColor[upcoming.status] || 'neutral'}>
                {upcoming.type === 'TELECONSULTATION' ? 'TELECONSULTATION' : 'PRESENTIEL'}
              </Badge>
            ) : (
              <Badge variant="neutral">Aucun</Badge>
            )}
          </div>

          {upcoming ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={upcoming.doctorName} size="md" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-slate-900">{upcoming.doctorName}</p>
                  <p className="text-sm text-slate-600">{upcoming.specialty}</p>
                </div>
              </div>
              <p className="text-[22px] font-bold text-slate-900">
                {new Date(upcoming.dateTime).toLocaleString('fr-MA', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-slate-700">
                <MapPin size={16} className="text-med-primary" />
                {upcoming.cabinetLabel || upcoming.cabinet || 'Cabinet'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => api.put(`/appointments/${upcoming.id}/cancel`, { reason: 'Annulation patient' }).then(() => toast.success('RDV annulé.')).catch((e) => toast.error(e?.response?.data?.message || 'Annulation impossible.'))}>
                  Annuler ce RDV
                </Button>
                <Button variant="outline" onClick={() => navigate(`/appointment/${upcoming.id}`)}>
                  Voir sur la carte
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Aucun rendez-vous à venir.</p>
              <Button onClick={() => navigate('/search')}>Prendre un rendez-vous →</Button>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Historique des rendez-vous</p>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'EN_ATTENTE', 'CONFIRME', 'COMPLETE', 'ANNULE'].map((s) => (
                <Button key={s} size="sm" variant={historyStatus === s ? undefined : 'outline'} onClick={() => { setHistoryStatus(s); setHistoryPage(1); }}>
                  {s === 'ALL' ? 'Tous' : s}
                </Button>
              ))}
            </div>
          </div>

          {historyQuery.isLoading ? (
            <Skeleton className="h-56" />
          ) : (
            <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
              {historyItems.map((rdv) => (
                <div key={rdv.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{rdv.doctorName}</p>
                      <p className="text-sm text-slate-600">{rdv.specialty}</p>
                      <p className="text-xs text-slate-500">{new Date(rdv.dateTime).toLocaleString('fr-MA')}</p>
                    </div>
                    <Badge variant={statusColor[rdv.status] || 'neutral'}>{rdv.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/appointment/${rdv.id}`)}>Détails</Button>
                    {rdv.status === 'COMPLETE' && rdv.canReview ? (
                      <Button size="sm" onClick={() => navigate(`/appointment/${rdv.id}`)}>Laisser un avis</Button>
                    ) : null}
                    {rdv.status === 'COMPLETE' && rdv.reviewReceived ? (
                      <Badge variant="success">Avis envoyé</Badge>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => navigate(`/doctor/${rdv.doctorId}`)}>Re-réserver</Button>
                  </div>

                </div>
              ))}
              {!historyItems.length ? <p className="text-sm text-slate-600">Aucun RDV.</p> : null}
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={!historyPagination?.hasPrevPage} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}>←</Button>
            <span className="text-sm">{historyPagination?.page || 1} / {historyPagination?.totalPages || 1}</span>
            <Button variant="outline" size="sm" disabled={!historyPagination?.hasNextPage} onClick={() => setHistoryPage((p) => p + 1)}>→</Button>
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">Médecins récurrents (≥ 2)</p>
          {recurringQuery.isLoading ? (
            <Skeleton className="h-44" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recurringDoctors.map((doc) => (
                <div key={doc.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="font-semibold text-slate-900">{doc.name}</p>
                  <p className="text-sm text-slate-600">{doc.specialty || '—'}</p>
                  <p className="text-xs text-slate-500">{doc.count} consultations</p>
                  <div className="mt-2">
                    <Button size="sm" onClick={() => navigate(`/doctor/${doc.id}`)}>Réserver à nouveau</Button>
                  </div>
                </div>
              ))}
              {!recurringDoctors.length ? <p className="text-sm text-slate-600">Aucun médecin récurrent.</p> : null}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">Mon profil médical</p>
          {dashboardQuery.isLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <div className="grid gap-2 text-sm text-slate-700">
              <p><span className="font-semibold">CIN</span>: {medical.cin || '—'}</p>
              <p><span className="font-semibold">Groupe sanguin</span>: {medical.bloodGroup || '—'}</p>
              <p><span className="font-semibold">Ville</span>: {medical.city || profile.city || '—'}</p>
              <p><span className="font-semibold">Antécédents</span>: {medical.antecedents || '—'}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setProfileForm({
                    adresse: medical.address || '',
                    ville: medical.city || profile.city || '',
                    groupeSanguin: medical.bloodGroup || '',
                    antecedents: medical.antecedents || '',
                  });
                  setIsProfileRequestOpen(true);
                }}
              >
                Demander une modification
              </Button>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadBadge ? <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>Tout marquer comme lu</Button>
          </div>

          {notificationsQuery.isLoading ? (
            <Skeleton className="h-56" />
          ) : (
            <div className="max-h-[350px] space-y-2 overflow-y-auto pr-1">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={notificationTone[n.type] || 'neutral'}>{n.type}</Badge>
                    {!n.isRead ? <span className="h-2 w-2 rounded-full bg-red-500" /> : null}
                    <p className="text-xs text-slate-500">{n.time}</p>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-700">{n.body}</p>
                </div>
              ))}
              {!notifications.length ? <p className="text-sm text-slate-600">Aucune notification.</p> : null}
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={!notificationsPagination?.hasPrevPage} onClick={() => setNotificationsPage((p) => Math.max(1, p - 1))}>←</Button>
            <span className="text-sm">{notificationsPagination?.page || 1} / {notificationsPagination?.totalPages || 1}</span>
            <Button variant="outline" size="sm" disabled={!notificationsPagination?.hasNextPage} onClick={() => setNotificationsPage((p) => p + 1)}>→</Button>
          </div>
        </Card>
      </div>
    </div>

    <Modal isOpen={isProfileRequestOpen} title="Demande de modification profil (validation admin)" onClose={() => setIsProfileRequestOpen(false)}>
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Ville" value={profileForm.ville} onChange={(e) => setProfileForm((c) => ({ ...c, ville: e.target.value }))} />
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Groupe sanguin (ex: O+)" value={profileForm.groupeSanguin} onChange={(e) => setProfileForm((c) => ({ ...c, groupeSanguin: e.target.value }))} />
            <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Adresse" value={profileForm.adresse} onChange={(e) => setProfileForm((c) => ({ ...c, adresse: e.target.value }))} />
            <textarea className="rounded-xl border px-3 py-2 text-sm md:col-span-2" rows={3} placeholder="Antécédents" value={profileForm.antecedents} onChange={(e) => setProfileForm((c) => ({ ...c, antecedents: e.target.value }))} />
            <textarea className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm md:col-span-2" rows={3} placeholder="Motif (obligatoire)" value={profileReason} onChange={(e) => setProfileReason(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => submitProfileRequest.mutate()} disabled={submitProfileRequest.isPending || profileReason.trim().length < 3}>
              Envoyer à l’admin
            </Button>
            <Button variant="outline" onClick={() => setIsProfileRequestOpen(false)}>Annuler</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default DashboardPatientPage;
