import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import MotionCard from '../components/ui/MotionCard';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

const summaryTone = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  neutral: 'neutral',
};

function AdminOverviewPage() {
  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard-overview'],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const response = await api.get('/dashboard/admin');
      return response.data?.data;
    },
  });

  const verifyReview = useMutation({
    mutationFn: async (reviewId) => api.post(`/admin/reviews/${reviewId}/verify`),
    onSuccess: async () => {
      toast.success('Avis validé.');
      await dashboardQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Validation impossible.'),
  });

  const patientRequestsQuery = useQuery({
    queryKey: ['admin-patient-change-requests'],
    staleTime: 15 * 1000,
    queryFn: async () => {
      const response = await api.get('/admin/patient-change-requests', { params: { page: 1, limit: 5 } });
      return response.data?.data;
    },
  });

  const approvePatientReq = useMutation({
    mutationFn: async (requestId) => api.post(`/admin/patient-change-requests/${requestId}/approve`, { reviewNote: 'Validé' }),
    onSuccess: async () => {
      toast.success('Demande patient approuvée.');
      await patientRequestsQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Action impossible.'),
  });

  const rejectPatientReq = useMutation({
    mutationFn: async (requestId) => api.post(`/admin/patient-change-requests/${requestId}/reject`, { reviewNote: 'Rejeté' }),
    onSuccess: async () => {
      toast.success('Demande patient rejetée.');
      await patientRequestsQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Action impossible.'),
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const dashboard = dashboardQuery.data || {};
  const summary = dashboard.summary || {};
  const activityLog = (dashboard.activityLog || []).slice(0, 5);
  const pendingReviews = (dashboard.reviewQueue || []).slice(0, 3);

  const summaryCards = [
    { label: 'Médecins vérifiés', value: summary.verifiedDoctors || 0, detail: 'Comptes actifs', tone: 'success' },
    { label: 'Médecins en attente', value: summary.pendingDoctors || 0, detail: 'Dossiers à examiner', tone: 'warning' },
    { label: 'Avis à valider', value: summary.pendingReviews || 0, detail: 'Modération requise', tone: 'info' },
    { label: 'RDV complétés', value: summary.completedAppointments || 0, detail: 'Consultations terminées', tone: 'neutral' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <MotionCard key={card.label} className="space-y-2">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="text-3xl font-bold text-slate-900">{card.value}</p>
            <Badge variant={summaryTone[card.tone] || 'neutral'}>{card.detail}</Badge>
          </MotionCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Dernières activités</p>
            <Badge variant="info">{activityLog.length}</Badge>
          </div>
          <div className="space-y-2">
            {activityLog.map((entry) => (
              <div key={entry} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {entry}
              </div>
            ))}
            {!activityLog.length ? <p className="text-sm text-slate-600">Aucune activité.</p> : null}
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Avis en attente</p>
            <Badge variant="warning">{pendingReviews.length}</Badge>
          </div>
          <div className="space-y-2">
            {pendingReviews.map((review) => (
              <div key={review.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{review.doctorName}</p>
                    <p className="text-xs text-slate-500">Patient: {review.patientName} • {review.rating}/5</p>
                    <p className="text-sm text-slate-700">{review.comment || '—'}</p>
                  </div>
                  <Button size="sm" onClick={() => verifyReview.mutate(review.id)} disabled={verifyReview.isPending}>
                    Valider
                  </Button>
                </div>
              </div>
            ))}
            {!pendingReviews.length ? <p className="text-sm text-slate-600">Aucun avis en attente.</p> : null}
          </div>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Demandes de modification patient (profil)</p>
          <Badge variant="warning">{patientRequestsQuery.data?.pagination?.total || 0}</Badge>
        </div>
        {patientRequestsQuery.isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <div className="space-y-2">
            {(patientRequestsQuery.data?.items || []).map((req) => (
              <div key={req.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{req.patientEmail || 'Patient'}</p>
                <p className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleString('fr-MA')}</p>
                <p className="text-sm text-slate-700">{req.reason}</p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-2 text-xs text-slate-600">{JSON.stringify(req.payload, null, 2)}</pre>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => approvePatientReq.mutate(req.id)} disabled={approvePatientReq.isPending}>Approuver</Button>
                  <Button size="sm" variant="outline" onClick={() => rejectPatientReq.mutate(req.id)} disabled={rejectPatientReq.isPending}>Rejeter</Button>
                </div>
              </div>
            ))}
            {!(patientRequestsQuery.data?.items || []).length ? (
              <p className="text-sm text-slate-600">Aucune demande en attente.</p>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminOverviewPage;
