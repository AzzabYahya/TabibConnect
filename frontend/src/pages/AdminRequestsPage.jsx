import { useMutation, useQuery } from '@tanstack/react-query';
import { FileImage, FileText, ShieldCheck, User, Stethoscope, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import { getCurrentSession } from '../lib/auth';

import AdminDocumentViewer from '../components/admin/AdminDocumentViewer';

function AdminRequestsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('doctors');

  // Doctor Requests
  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard-requests'],
    staleTime: 20 * 1000,
    queryFn: async () => {
      const response = await api.get('/dashboard/admin');
      return response.data?.data;
    },
  });

  // Patient Requests
  const patientRequestsQuery = useQuery({
    queryKey: ['admin-patient-change-requests'],
    staleTime: 15 * 1000,
    queryFn: async () => {
      const response = await api.get('/admin/patient-change-requests', { params: { page: 1, limit: 20 } });
      return response.data?.data;
    },
  });

  const doctorChangeRequests = useMemo(() => {
    const dashboard = dashboardQuery.data || {};
    return Array.isArray(dashboard.doctorChangeRequests) ? dashboard.doctorChangeRequests : [];
  }, [dashboardQuery.data]);

  const doctorPhotoRequests = useMemo(
    () => doctorChangeRequests.filter((req) => req.type === 'PROFILE_PHOTO_UPDATE'),
    [doctorChangeRequests]
  );
  const doctorOtherRequests = useMemo(
    () => doctorChangeRequests.filter((req) => req.type !== 'PROFILE_PHOTO_UPDATE'),
    [doctorChangeRequests]
  );

  const patientRequests = useMemo(() => patientRequestsQuery.data?.items || [], [patientRequestsQuery.data]);

  // Mutations
  const approveDoctorChange = useMutation({
    mutationFn: async (requestId) =>
      api.post(`/dashboard/admin/doctor-change-requests/${requestId}/approve`, { reviewNote: 'Validé' }),
    onSuccess: async () => {
      toast.success('Demande approuvée.');
      await dashboardQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Action impossible.'),
  });

  const rejectDoctorChange = useMutation({
    mutationFn: async (requestId) =>
      api.post(`/dashboard/admin/doctor-change-requests/${requestId}/reject`, { reviewNote: 'Rejeté' }),
    onSuccess: async () => {
      toast.success('Demande rejetée.');
      await dashboardQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Action impossible.'),
  });

  const approvePatientReq = useMutation({
    mutationFn: async (requestId) =>
      api.post(`/admin/patient-change-requests/${requestId}/approve`, { reviewNote: 'Validé' }),
    onSuccess: async () => {
      toast.success('Demande patient approuvée.');
      await patientRequestsQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Action impossible.'),
  });

  const rejectPatientReq = useMutation({
    mutationFn: async (requestId) =>
      api.post(`/admin/patient-change-requests/${requestId}/reject`, { reviewNote: 'Rejeté' }),
    onSuccess: async () => {
      toast.success('Demande patient rejetée.');
      await patientRequestsQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Action impossible.'),
  });

  if (dashboardQuery.isLoading || patientRequestsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-med-primary/10 bg-gradient-to-br from-indigo-50/50 via-white to-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Centre de Validation</h1>
            <p className="text-sm text-slate-600">
              Gérez les demandes de modification de profil des médecins et patients.
            </p>
          </div>
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('doctors')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'doctors' ? 'bg-white text-med-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Stethoscope size={16} />
              Médecins
              {doctorChangeRequests.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-med-primary text-[10px] text-white px-1">
                  {doctorChangeRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'patients' ? 'bg-white text-med-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <User size={16} />
              Patients
              {patientRequests.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 text-[10px] text-white px-1">
                  {patientRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </Card>

      {activeTab === 'doctors' ? (
        <div className="space-y-6">
          {/* Doctor Photo Requests */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileImage size={18} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 underline decoration-blue-200 underline-offset-4">Photos de profil (Médecins)</h2>
            </div>

            <div className="grid gap-6">
              {doctorPhotoRequests.map((req) => (
                <Card key={req.id} className="relative overflow-hidden border-slate-100 bg-white hover:border-blue-200 transition-colors">
                  <div className="grid lg:grid-cols-[1fr_300px] gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                            {req.doctorName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{req.doctorName}</p>
                            <p className="text-xs text-slate-500">{req.doctorEmail}</p>
                          </div>
                        </div>
                        <Badge variant="warning" className="flex items-center gap-1">
                          <Clock size={10} /> EN ATTENTE
                        </Badge>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Motif de la demande</p>
                        <p className="text-sm text-slate-700 italic">"{req.reason}"</p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document d'identité (CIN)</p>
                          <AdminDocumentViewer
                            endpoint={`/admin/users/${req.userId || req.doctorId}/cin`}
                            title="Carte Nationale (CIN)"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aperçu nouvelle photo</p>
                          <AdminDocumentViewer
                            endpoint={`/admin/doctors/${req.doctorId}/documents/${req.payload?.documentId}`}
                            title="Aperçu photo de profil"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <Button size="sm" onClick={() => approveDoctorChange.mutate(req.id)} disabled={approveDoctorChange.isPending}>
                          <CheckCircle2 size={16} className="mr-1.5" /> Approuver la photo
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-100" onClick={() => rejectDoctorChange.mutate(req.id)} disabled={rejectDoctorChange.isPending}>
                          <XCircle size={16} className="mr-1.5" /> Rejeter
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {!doctorPhotoRequests.length && (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <FileImage size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">Aucune demande de photo médecin</p>
                </div>
              )}
            </div>
          </div>

          {/* Doctor Other Requests */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <FileText size={18} className="text-indigo-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 underline decoration-indigo-200 underline-offset-4">Modifications de profil (Médecins)</h2>
            </div>

            <div className="grid gap-6">
              {doctorOtherRequests.map((req) => (
                <Card key={req.id} className="border-slate-100 bg-white">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                          {req.doctorName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{req.doctorName}</p>
                          <p className="text-xs text-slate-500">{req.doctorEmail}</p>
                        </div>
                      </div>
                      <Badge variant="info">{req.type === 'PROFILE_UPDATE' ? 'Profil' : 'Cabinet'}</Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Raison invoquée</p>
                          <p className="text-sm text-slate-700 italic">"{req.reason}"</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vérification identité</p>
                          <AdminDocumentViewer
                            endpoint={`/admin/users/${req.userId || req.doctorId}/cin`}
                            title="Carte Nationale (CIN)"
                          />
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Données soumises</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(req.payload || {}).map(([key, value]) => {
                            if (key === 'documentId') return null;
                            return (
                              <div key={key} className="bg-white p-2 rounded-lg border border-slate-200 overflow-hidden">
                                <p className="text-[10px] uppercase font-bold text-slate-400 truncate">{key}</p>
                                <p className="text-xs font-semibold text-slate-900 truncate">
                                  {Array.isArray(value) ? value.join(', ') : String(value)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <Button size="sm" onClick={() => approveDoctorChange.mutate(req.id)} disabled={approveDoctorChange.isPending}>
                        Valider les changements
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectDoctorChange.mutate(req.id)} disabled={rejectDoctorChange.isPending}>
                        Rejeter
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {!doctorOtherRequests.length && (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-500 font-medium">Aucune autre demande médecin</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <div className="p-2 bg-orange-50 rounded-lg">
              <User size={18} className="text-orange-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 underline decoration-orange-200 underline-offset-4">Demandes de modification (Patients)</h2>
          </div>

          <div className="grid gap-6">
            {patientRequests.map((req) => (
              <Card key={req.id} className="border-slate-100 bg-white hover:border-orange-200 transition-colors">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                        {req.patientEmail?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{req.patientEmail || 'Patient anonyme'}</p>
                        <p className="text-xs text-slate-500">Inscrit le {new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant="warning">MODIFICATION PROFIL</Badge>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Motif / Commentaire</p>
                    <p className="text-sm text-slate-700">"{req.reason}"</p>
                  </div>

                  <div className="grid lg:grid-cols-[1fr_200px] gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {req.payload.adresse && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adresse</p>
                            <p className="text-xs font-semibold text-slate-900 mt-0.5">{req.payload.adresse}</p>
                          </div>
                        )}
                        {req.payload.ville && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ville</p>
                            <p className="text-xs font-semibold text-slate-900 mt-0.5">{req.payload.ville}</p>
                          </div>
                        )}
                        {req.payload.groupeSanguin && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Groupe S.</p>
                            <p className="text-xs font-semibold text-slate-900 mt-0.5">{req.payload.groupeSanguin}</p>
                          </div>
                        )}
                        {req.payload.antecedents && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Antécédents</p>
                            <p className="text-xs font-semibold text-slate-900 mt-0.5 truncate">{req.payload.antecedents}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document d'identité patient</p>
                        <AdminDocumentViewer
                          endpoint={`/admin/users/${req.userId}/cin`}
                          title="CIN Patient"
                        />
                      </div>
                    </div>

                    {req.payload.documentId && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nouvelle Photo</p>
                        <div className="aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-100 group relative">
                          <img
                            src={`${api.defaults.baseURL}/admin/patients/${req.patientId}/documents/${req.payload.documentId}?token=${getCurrentSession().accessToken}`}
                            alt="Nouvelle"
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                            onError={(e) => { e.target.src = '/assets/avatars/default_male.png'; }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button size="sm" variant="ghost" className="text-white" onClick={() => window.open(`${api.defaults.baseURL}/admin/patients/${req.patientId}/documents/${req.payload.documentId}?token=${getCurrentSession().accessToken}`, '_blank')}>
                              Agrandir
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <Button size="sm" onClick={() => approvePatientReq.mutate(req.id)} disabled={approvePatientReq.isPending}>
                      Approuver le profil patient
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectPatientReq.mutate(req.id)} disabled={rejectPatientReq.isPending}>
                      Rejeter
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {!patientRequests.length && (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <User size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">Aucune demande patient en attente</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Card className="border-med-primary/10 bg-slate-50/50">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <ShieldCheck size={18} className="text-med-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Note de sécurité</p>
            <p className="text-sm text-slate-600 mt-0.5">
              Toute validation met immédiatement à jour les informations du profil public et archivé.
              Vérifiez toujours la cohérence entre le document d'identité (CIN) et la photo de profil demandée.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default AdminRequestsPage;

