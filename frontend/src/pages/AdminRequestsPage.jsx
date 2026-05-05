import { useMutation, useQuery } from '@tanstack/react-query';
import { FileImage, FileText, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

function AdminDocumentImage({ doctorId, documentId }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    let objectUrl = '';

    const load = async () => {
      try {
        setError(false);
        setUrl('');
        const response = await api.get(`/admin/doctors/${doctorId}/documents/${documentId}`, {
          responseType: 'blob',
        });
        objectUrl = URL.createObjectURL(response.data);
        if (mounted) {
          setUrl(objectUrl);
        }
      } catch {
        if (mounted) {
          setError(true);
        }
      }
    };

    if (doctorId && documentId) {
      load();
    }

    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [doctorId, documentId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-600">
        Aperçu indisponible.
      </div>
    );
  }

  if (!url) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        <img
          src={url}
          alt="Photo de profil proposée"
          className="h-[360px] w-full object-contain bg-slate-950/5 md:h-[420px]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 opacity-0 transition group-hover:opacity-100">
          Cliquer pour zoomer
        </div>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 cursor-zoom-out" onClick={() => setIsOpen(false)} aria-label="Fermer" />
          <div className="relative z-[61] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Aperçu photo de profil</p>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm">
                Fermer
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto bg-slate-50 p-3">
              <img src={url} alt="Aperçu photo de profil" className="mx-auto w-full max-w-4xl object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AdminRequestsPage() {
  const navigate = useNavigate();

  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard-requests'],
    staleTime: 20 * 1000,
    queryFn: async () => {
      const response = await api.get('/dashboard/admin');
      return response.data?.data;
    },
  });

  const doctorChangeRequests = useMemo(() => {
    const dashboard = dashboardQuery.data || {};
    return Array.isArray(dashboard.doctorChangeRequests) ? dashboard.doctorChangeRequests : [];
  }, [dashboardQuery.data]);

  const photoRequests = useMemo(
    () => doctorChangeRequests.filter((req) => req.type === 'PROFILE_PHOTO_UPDATE'),
    [doctorChangeRequests]
  );
  const otherRequests = useMemo(
    () => doctorChangeRequests.filter((req) => req.type !== 'PROFILE_PHOTO_UPDATE'),
    [doctorChangeRequests]
  );

  const approveDoctorChange = useMutation({
    mutationFn: async (requestId) =>
      api.post(`/dashboard/admin/doctor-change-requests/${requestId}/approve`, {
        reviewNote: 'Validé',
      }),
    onSuccess: async () => {
      toast.success('Demande approuvée.');
      await dashboardQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Action impossible.'),
  });

  const rejectDoctorChange = useMutation({
    mutationFn: async (requestId) =>
      api.post(`/dashboard/admin/doctor-change-requests/${requestId}/reject`, {
        reviewNote: 'Rejeté',
      }),
    onSuccess: async () => {
      toast.success('Demande rejetée.');
      await dashboardQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Action impossible.'),
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-2 border-med-primary/20 bg-gradient-to-br from-cyan-50 to-white">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Demandes (validation admin)</h1>
        <p className="text-sm text-slate-700">
          Centralise les demandes sensibles. Exemple: <span className="font-semibold">changement de photo de profil</span> (prévisualisation + approbation).
        </p>
      </Card>

      <Card className="space-y-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileImage size={16} className="text-med-primary" /> Changement photo de profil (médecin)
        </p>

        <div className="space-y-3">
          {photoRequests.map((req) => {
            const documentId = req.payload?.documentId;
            const doctorId = req.doctorId;
            const canPreview = Boolean(documentId && doctorId);

            return (
              <Card key={req.id} className="space-y-3 bg-slate-50/90">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button type="button" onClick={() => navigate(`/dashboard/admin`)} className="text-left">
                      <p className="truncate text-sm font-semibold text-slate-900">{req.doctorName}</p>
                      <p className="truncate text-xs text-slate-500">{req.doctorEmail}</p>
                    </button>
                    <p className="mt-1 text-xs text-slate-600">{req.reason}</p>
                  </div>
                  <Badge variant="warning">PENDING</Badge>
                </div>

                {canPreview ? (
                  <AdminDocumentImage doctorId={doctorId} documentId={documentId} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-600">
                    Aperçu indisponible (document manquant).
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => approveDoctorChange.mutate(req.id)} disabled={approveDoctorChange.isPending}>
                    Approuver la photo
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectDoctorChange.mutate(req.id)} disabled={rejectDoctorChange.isPending}>
                    Rejeter
                  </Button>
                </div>
              </Card>
            );
          })}
          {!photoRequests.length ? <p className="text-sm text-slate-600">Aucune demande de photo en attente.</p> : null}
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileText size={16} className="text-med-primary" /> Autres demandes médecin
        </p>
        <div className="space-y-3">
          {otherRequests.map((req) => (
            <Card key={req.id} className="space-y-3 bg-slate-50/90">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{req.doctorName}</p>
                  <p className="truncate text-xs text-slate-500">{req.doctorEmail}</p>
                  <p className="mt-1 text-xs text-slate-600">{req.type}</p>
                </div>
                <Badge variant="warning">PENDING</Badge>
              </div>
              <p className="text-sm text-slate-700">{req.reason}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {req.type === 'PROFILE_UPDATE' ? (
                  <>
                    <div className="rounded-2xl bg-white p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Nom complet</p>
                      <p className="mt-1 font-semibold text-slate-900">{req.payload?.nomComplet || '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Spécialité</p>
                      <p className="mt-1 font-semibold text-slate-900">{req.payload?.specialite || '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Tarif</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {req.payload?.tarifConsultation !== undefined ? `${req.payload?.tarifConsultation} MAD` : '—'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Expérience</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {req.payload?.experience !== undefined ? `${req.payload?.experience} ans` : '—'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-sm md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Langues</p>
                      <p className="mt-1 text-slate-800">
                        {Array.isArray(req.payload?.languesParlees) && req.payload.languesParlees.length
                          ? req.payload.languesParlees.join(', ')
                          : '—'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-sm md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Diplômes</p>
                      <p className="mt-1 text-slate-800">
                        {Array.isArray(req.payload?.diplomes) && req.payload.diplomes.length ? req.payload.diplomes.join(', ') : '—'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-sm md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Bio</p>
                      <p className="mt-1 text-slate-800">{req.payload?.bio || '—'}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl bg-white p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Nom cabinet</p>
                      <p className="mt-1 font-semibold text-slate-900">{req.payload?.nom || '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Ville</p>
                      <p className="mt-1 font-semibold text-slate-900">{req.payload?.ville || '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-sm md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Adresse</p>
                      <p className="mt-1 text-slate-800">{req.payload?.adresse || '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-sm md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Quartier</p>
                      <p className="mt-1 text-slate-800">{req.payload?.quartier || '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Latitude</p>
                      <p className="mt-1 font-semibold text-slate-900">{req.payload?.latitude ?? '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Longitude</p>
                      <p className="mt-1 font-semibold text-slate-900">{req.payload?.longitude ?? '—'}</p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => approveDoctorChange.mutate(req.id)} disabled={approveDoctorChange.isPending}>
                  Approuver
                </Button>
                <Button size="sm" variant="outline" onClick={() => rejectDoctorChange.mutate(req.id)} disabled={rejectDoctorChange.isPending}>
                  Rejeter
                </Button>
              </div>
            </Card>
          ))}
          {!otherRequests.length ? <p className="text-sm text-slate-600">Aucune autre demande en attente.</p> : null}
        </div>
      </Card>

      <Card className="space-y-2 bg-slate-50/90">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck size={16} className="text-med-primary" /> Conseil
        </p>
        <p className="text-sm text-slate-700">
          Pour les demandes de photo, la validation met à jour la photo de profil active (une seule à la fois).
        </p>
      </Card>
    </div>
  );
}

export default AdminRequestsPage;

