import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Star,
  UsersRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import MotionCard from '../components/ui/MotionCard';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import { formatSpecialtyLabel } from '../lib/frenchText';
import { MOROCCO_CITY_SELECT_OPTIONS } from '../lib/moroccoCities';
import useRealtimeDashboard from '../hooks/useRealtimeDashboard';

const MotionDiv = motion.div;

const fallbackAdminDashboard = {
  summary: {},
  verificationQueue: [],
  reviewQueue: [],
  platformSignals: [],
  activityLog: [],
  doctorChangeRequests: [],
};

const summaryTone = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  neutral: 'neutral',
};

function DashboardAdminPage() {
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState(null);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountSort, setAccountSort] = useState('recent');
  const [accountRoleFilter, setAccountRoleFilter] = useState('ALL');
  const [explorerTab, setExplorerTab] = useState('accounts');
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [notifyChannel, setNotifyChannel] = useState('both');
  const [notifySubject, setNotifySubject] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [linkedPatientSort, setLinkedPatientSort] = useState('recent');
  const [linkedDoctorSort, setLinkedDoctorSort] = useState('recent');
  const [expandedPendingDoctorId, setExpandedPendingDoctorId] = useState(null);
  const [createAccountForm, setCreateAccountForm] = useState({
    role: 'PATIENT',
    email: '',
    phone: '',
    password: '',
    isVerified: true,
    nomComplet: '',
    cin: '',
    dateOfNaissance: '',
    sexe: 'HOMME',
    adresse: '',
    ville: '',
    inpe: '',
    specialite: '',
    tarifConsultation: '',
    experience: '',
    cinDocument: null,
  });

  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard'],
    staleTime: 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await api.get('/dashboard/admin');
      return response.data?.data || fallbackAdminDashboard;
    },
  });

  useRealtimeDashboard({
    onNotification: () => {
      dashboardQuery.refetch();
    },
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`admin-summary-${index + 1}`} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <Card className="space-y-4 border-red-200 bg-red-50/70">
        <Badge variant="warning">Backoffice indisponible</Badge>
        <h1 className="text-2xl font-bold text-red-900">Impossible de charger le tableau de bord admin</h1>
        <p className="text-sm text-red-800">
          Verifiez votre session administrateur ou reconnectez-vous.
        </p>
        <Button onClick={() => navigate('/connexion')}>
          Aller à la connexion
        </Button>
      </Card>
    );
  }

  const dashboard = dashboardQuery.data || fallbackAdminDashboard;
  const summary = dashboard.summary || {};
  const verificationQueue = dashboard.verificationQueue || [];
  const reviewQueue = dashboard.reviewQueue || [];
  const platformSignals = dashboard.platformSignals || [];
  const activityLog = dashboard.activityLog || [];
  const accounts = dashboard.accounts || [];
  const doctorChangeRequests = dashboard.doctorChangeRequests || [];

  const sortedAccounts = [...accounts]
    .filter((account) => {
      const q = accountSearch.trim().toLowerCase();
      if (!q) {
        return true;
      }
      return (
        String(account.email || '').toLowerCase().includes(q)
        || String(account.role || '').toLowerCase().includes(q)
        || String(account.doctor?.nomComplet || '').toLowerCase().includes(q)
        || String(account.patient?.ville || '').toLowerCase().includes(q)
      );
    })
    .filter((account) => (accountRoleFilter === 'ALL' ? true : account.role === accountRoleFilter))
    .sort((left, right) => {
      if (accountSort === 'role') {
        return String(left.role).localeCompare(String(right.role));
      }
      if (accountSort === 'email') {
        return String(left.email).localeCompare(String(right.email));
      }
      if (accountSort === 'notifications') {
        return (right.notificationsCount || 0) - (left.notificationsCount || 0);
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  const selectedAccount = sortedAccounts.find((account) => account.id === selectedAccountId) || sortedAccounts[0] || null;
  const sortedLinkedPatients = [...(selectedAccount?.consultedPatients || [])].sort((left, right) => {
    if (linkedPatientSort === 'name') {
      return String(left.patientName || '').localeCompare(String(right.patientName || ''));
    }
    if (linkedPatientSort === 'status') {
      return String(left.status || '').localeCompare(String(right.status || ''));
    }
    return new Date(right.dateTime || 0).getTime() - new Date(left.dateTime || 0).getTime();
  });
  const sortedLinkedDoctors = [...(selectedAccount?.consultedDoctors || [])].sort((left, right) => {
    if (linkedDoctorSort === 'name') {
      return String(left.doctorName || '').localeCompare(String(right.doctorName || ''));
    }
    if (linkedDoctorSort === 'specialty') {
      return String(left.specialty || '').localeCompare(String(right.specialty || ''));
    }
    return new Date(right.dateTime || 0).getTime() - new Date(left.dateTime || 0).getTime();
  });

  const handleVerifyDoctor = async (doctor) => {
    const actionKey = `doctor-${doctor.id}`;

    try {
      setActiveAction(actionKey);
      await api.post(`/dashboard/admin/doctors/${doctor.doctorId}/verify`);
      toast.success(`${doctor.name} a été vérifié.`);
      await dashboardQuery.refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible de vérifier ce médecin.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleVerifyReview = async (review) => {
    const actionKey = `review-${review.id}`;

    try {
      setActiveAction(actionKey);
      await api.post(`/dashboard/admin/reviews/${review.id}/verify`);
      toast.success(`Avis de ${review.patientName} validé.`);
      await dashboardQuery.refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible de vérifier cet avis.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleNotifyAccount = async () => {
    if (!selectedAccount) {
      return;
    }
    if (!notifyMessage.trim()) {
      toast.error('Le message est requis.');
      return;
    }

    try {
      setActiveAction(`notify-${selectedAccount.id}`);
      await api.post(`/dashboard/admin/accounts/${selectedAccount.id}/notify`, {
        channel: notifyChannel,
        subject: notifySubject,
        message: notifyMessage,
      });
      toast.success('Notification envoyee.');
      setNotifyMessage('');
      if (notifyChannel === 'email') {
        setNotifySubject('');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible d envoyer la notification.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setActiveAction('create-account');
      const formData = new FormData();
      formData.append('role', createAccountForm.role);
      formData.append('email', createAccountForm.email);
      formData.append('phone', createAccountForm.phone);
      formData.append('password', createAccountForm.password);
      formData.append('isVerified', createAccountForm.isVerified ? 'true' : 'false');
      if (createAccountForm.cinDocument) {
        formData.append('cinDocument', createAccountForm.cinDocument);
      }
      if (createAccountForm.role === 'PATIENT') {
        formData.append('cin', createAccountForm.cin);
        formData.append('dateOfNaissance', createAccountForm.dateOfNaissance);
        formData.append('sexe', createAccountForm.sexe);
        formData.append('adresse', createAccountForm.adresse);
        formData.append('ville', createAccountForm.ville);
      }
      if (createAccountForm.role === 'DOCTOR') {
        formData.append('inpe', createAccountForm.inpe);
        formData.append('specialite', createAccountForm.specialite);
        formData.append('tarifConsultation', String(Number(createAccountForm.tarifConsultation)));
        formData.append('experience', String(Number(createAccountForm.experience)));
      }
      await api.post('/dashboard/admin/accounts', formData);
      toast.success('Compte créé avec succès.');
      setCreateAccountForm((current) => ({
        ...current,
        email: '',
        phone: '',
        password: '',
        nomComplet: '',
        cin: '',
        dateOfNaissance: '',
        adresse: '',
        ville: '',
        inpe: '',
        specialite: '',
        tarifConsultation: '',
        experience: '',
        cinDocument: null,
      }));
      await dashboardQuery.refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Création de compte impossible.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleApproveDoctorChangeRequest = async (request) => {
    try {
      setActiveAction(`change-approve-${request.id}`);
      await api.post(`/dashboard/admin/doctor-change-requests/${request.id}/approve`, {
        reviewNote: 'Demande validée par admin',
      });
      toast.success('Demande de changement approuvée.');
      await dashboardQuery.refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Validation impossible.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleRejectDoctorChangeRequest = async (request) => {
    const reason = window.prompt('Raison du refus (optionnel)');
    try {
      setActiveAction(`change-reject-${request.id}`);
      await api.post(`/dashboard/admin/doctor-change-requests/${request.id}/reject`, {
        reviewNote: reason || '',
      });
      toast.success('Demande de changement rejetée.');
      await dashboardQuery.refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Rejet impossible.');
    } finally {
      setActiveAction(null);
    }
  };

  const summaryCards = [
    {
      label: 'Médecins vérifiés',
      value: summary.verifiedDoctors || 0,
      detail: 'Comptes actifs et validés',
      tone: 'success',
      icon: BadgeCheck,
    },
    {
      label: 'Médecins en attente',
      value: summary.pendingDoctors || 0,
      detail: 'Dossiers à examiner',
      tone: 'warning',
      icon: ShieldAlert,
    },
    {
      label: 'Avis à vérifier',
      value: summary.pendingReviews || 0,
      detail: 'Commentaires non vérifiés',
      tone: 'info',
      icon: AlertTriangle,
    },
    {
      label: 'RDV complétés',
      value: summary.completedAppointments || 0,
      detail: 'Consultations terminées',
      tone: 'neutral',
      icon: CheckCircle2,
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      <header className="space-y-3">
        <Badge variant="warning">Backoffice admin alimenté par la base</Badge>
        <div
          className="h-36 w-full rounded-3xl bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.52), rgba(15,23,42,0.52)), url('https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1600&q=80')",
          }}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Dashboard Admin
            </h1>
            <p className="max-w-3xl text-slate-600">
              Les vérifications médecins, les avis en attente et les statistiques globales sont lus depuis la base.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <Clock3 size={16} className="text-med-primary" />
            Vue administrateur en temps réel
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <MotionCard key={card.label} delay={index * 0.05} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                </div>
                <div className="rounded-2xl bg-med-primary/10 p-3 text-med-primary">
                  <Icon size={20} />
                </div>
              </div>
              <Badge variant={summaryTone[card.tone] || 'neutral'}>{card.detail}</Badge>
            </MotionCard>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <MotionCard className="space-y-5 border-2 border-med-primary/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Explorateur de comptes</h2>
              <p className="text-sm text-slate-600">Section prioritaire: visible en haut pour ouvrir les fiches comptes.</p>
            </div>
            <Badge variant="info">{sortedAccounts.length} comptes</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={explorerTab === 'accounts' ? undefined : 'outline'} onClick={() => setExplorerTab('accounts')}>
              Comptes existants
            </Button>
            <Button size="sm" variant={explorerTab === 'create' ? undefined : 'outline'} onClick={() => setExplorerTab('create')}>
              Créer un compte
            </Button>
          </div>
          {explorerTab === 'accounts' ? (
            <>
          {sortedAccounts.length === 0 ? (
            <Card className="bg-amber-50/80 text-amber-900">
              Aucun compte retourne par l API. Rechargez la page apres redemarrage du backend.
            </Card>
          ) : null}
          <div className="grid gap-3 md:grid-cols-[1fr,220px,220px]">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <Search size={16} className="text-med-primary" />
              <input
                value={accountSearch}
                onChange={(event) => setAccountSearch(event.target.value)}
                placeholder="Rechercher email, role, nom..."
                className="w-full bg-transparent outline-none"
              />
            </label>
            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <ArrowUpDown size={16} className="text-med-primary" />
              <select
                value={accountSort}
                onChange={(event) => setAccountSort(event.target.value)}
                className="w-full bg-transparent outline-none"
              >
                <option value="recent">Plus recent</option>
                <option value="role">Role</option>
                <option value="email">Email</option>
                <option value="notifications">Notifications</option>
              </select>
            </label>
            <select
              value={accountRoleFilter}
              onChange={(event) => setAccountRoleFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
            >
              <option value="ALL">Tous les rôles</option>
              <option value="ADMIN">Admin</option>
              <option value="DOCTOR">Docteur</option>
              <option value="PATIENT">Patient</option>
            </select>
          </div>

          <div className="max-h-[38rem] space-y-3 overflow-y-auto pr-1">
            {sortedAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedAccountId(account.id)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  selectedAccount?.id === account.id
                    ? 'border-med-primary bg-cyan-50'
                    : 'border-slate-200 bg-slate-50/80 hover:border-med-primary/40'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{account.doctor?.nomComplet || account.email}</p>
                  <Badge variant={account.isVerified ? 'success' : 'warning'}>{account.role}</Badge>
                </div>
                <p className="text-xs text-slate-500">{account.email}</p>
              </button>
            ))}
          </div>
            </>
          ) : (
            <Card className="space-y-3 bg-slate-50/90">
              <h3 className="text-lg font-semibold text-slate-900">Créer un compte par rôle</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={createAccountForm.role} onChange={(event) => setCreateAccountForm((c) => ({ ...c, role: event.target.value }))}>
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Docteur</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={createAccountForm.isVerified} onChange={(event) => setCreateAccountForm((c) => ({ ...c, isVerified: event.target.checked }))} />
                  Compte vérifié
                </label>
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Email" value={createAccountForm.email} onChange={(event) => setCreateAccountForm((c) => ({ ...c, email: event.target.value }))} />
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Téléphone" value={createAccountForm.phone} onChange={(event) => setCreateAccountForm((c) => ({ ...c, phone: event.target.value }))} />
                <input type="password" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="Mot de passe" value={createAccountForm.password} onChange={(event) => setCreateAccountForm((c) => ({ ...c, password: event.target.value }))} />
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-600">Carte d identité nationale (obligatoire)</label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    onChange={(event) => setCreateAccountForm((c) => ({ ...c, cinDocument: event.target.files?.[0] || null }))}
                  />
                </div>
                <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="Nom complet (optionnel)" value={createAccountForm.nomComplet} onChange={(event) => setCreateAccountForm((c) => ({ ...c, nomComplet: event.target.value }))} />
                {createAccountForm.role === 'PATIENT' ? (
                  <>
                    <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="CIN" value={createAccountForm.cin} onChange={(event) => setCreateAccountForm((c) => ({ ...c, cin: event.target.value }))} />
                    <input type="date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={createAccountForm.dateOfNaissance} onChange={(event) => setCreateAccountForm((c) => ({ ...c, dateOfNaissance: event.target.value }))} />
                    <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={createAccountForm.sexe} onChange={(event) => setCreateAccountForm((c) => ({ ...c, sexe: event.target.value }))}>
                      <option value="HOMME">Homme</option>
                      <option value="FEMME">Femme</option>
                    </select>
                    <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={createAccountForm.ville} onChange={(event) => setCreateAccountForm((c) => ({ ...c, ville: event.target.value }))}>
                      <option value="">Ville (Maroc)</option>
                      {MOROCCO_CITY_SELECT_OPTIONS.map((option) => (
                        <option key={option.label} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="Adresse" value={createAccountForm.adresse} onChange={(event) => setCreateAccountForm((c) => ({ ...c, adresse: event.target.value }))} />
                  </>
                ) : null}
                {createAccountForm.role === 'DOCTOR' ? (
                  <>
                    <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="INPE" value={createAccountForm.inpe} onChange={(event) => setCreateAccountForm((c) => ({ ...c, inpe: event.target.value }))} />
                    <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Spécialité" value={createAccountForm.specialite} onChange={(event) => setCreateAccountForm((c) => ({ ...c, specialite: event.target.value }))} />
                    <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Tarif consultation (MAD)" value={createAccountForm.tarifConsultation} onChange={(event) => setCreateAccountForm((c) => ({ ...c, tarifConsultation: event.target.value }))} />
                    <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Expérience (années)" value={createAccountForm.experience} onChange={(event) => setCreateAccountForm((c) => ({ ...c, experience: event.target.value }))} />
                  </>
                ) : null}
              </div>
              <Button onClick={handleCreateAccount} disabled={activeAction === 'create-account'}>
                {activeAction === 'create-account' ? 'Création...' : 'Créer le compte'}
              </Button>
            </Card>
          )}
        </MotionCard>

        <MotionCard className="space-y-5">
          {selectedAccount ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedAccount.doctor?.nomComplet || selectedAccount.email}</h2>
                  <p className="text-sm text-slate-600">{selectedAccount.email}</p>
                </div>
                <Badge variant={selectedAccount.isVerified ? 'success' : 'warning'}>
                  {selectedAccount.isVerified ? 'Verifie' : 'Non verifie'}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="space-y-1 bg-slate-50/90">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Telephone</p>
                  <p className="font-semibold text-slate-900">{selectedAccount.phone || 'Non renseigne'}</p>
                </Card>
                <Card className="space-y-1 bg-slate-50/90">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Notifications</p>
                  <p className="font-semibold text-slate-900">{selectedAccount.notificationsCount || 0}</p>
                </Card>
              </div>

              {selectedAccount.role === 'PATIENT' ? (
                <Card className="space-y-3 border-med-primary/20 bg-med-primary/5">
                  <p className="text-sm font-semibold text-slate-900">Audit patient</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">CIN</p>
                      <p className="font-semibold text-slate-900">{selectedAccount.patient?.cin || 'Non renseigne'}</p>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Ville</p>
                      <p className="font-semibold text-slate-900">{selectedAccount.patient?.ville || 'Non renseignee'}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Reference fichier CIN</p>
                    {selectedAccount.patient?.cinDocumentFileName ? (
                      <>
                        <p className="mt-1 font-semibold text-slate-900">{selectedAccount.patient.cinDocumentFileName}</p>
                        <p className="text-xs text-slate-500">Chemin: {selectedAccount.patient.cinDocumentFilePath}</p>
                        <p className="text-xs text-slate-500">
                          Type: {selectedAccount.patient.cinDocumentMimeType || 'N/A'}
                          {selectedAccount.patient.cinDocumentSize ? ` | Taille: ${selectedAccount.patient.cinDocumentSize} bytes` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          Verification: {selectedAccount.patient.cinDocumentVerificationStatus || 'PENDING'}
                          {selectedAccount.patient.cinDocumentVerificationScore ? ` | Score: ${selectedAccount.patient.cinDocumentVerificationScore}` : ''}
                        </p>
                        {selectedAccount.patient.cinDocumentVerificationNote ? (
                          <p className="text-xs text-slate-500">Note: {selectedAccount.patient.cinDocumentVerificationNote}</p>
                        ) : null}
                        <p className="text-xs text-slate-500">
                          Upload: {selectedAccount.patient.cinDocumentUploadedAt
                            ? new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(selectedAccount.patient.cinDocumentUploadedAt))
                            : 'Date non renseignee'}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-amber-700">Aucune reference CIN en base pour ce compte.</p>
                    )}
                  </div>
                </Card>
              ) : null}

              {selectedAccount.role === 'DOCTOR' ? (
                <Card className="space-y-3 bg-slate-50/90">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">Patients consultes</p>
                    <select
                      value={linkedPatientSort}
                      onChange={(event) => setLinkedPatientSort(event.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none"
                    >
                      <option value="recent">Plus recent</option>
                      <option value="name">Nom</option>
                      <option value="status">Statut</option>
                    </select>
                  </div>
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {sortedLinkedPatients.length ? (
                      sortedLinkedPatients.map((entry) => (
                        <div key={entry.appointmentId} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                          <p className="font-semibold text-slate-900">{entry.patientName}</p>
                          <p className="text-xs text-slate-500">{entry.reason || 'Motif non renseigne'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Aucun patient relie.</p>
                    )}
                  </div>
                </Card>
              ) : null}

              {selectedAccount.role === 'PATIENT' ? (
                <Card className="space-y-3 bg-slate-50/90">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">Medecins consultes</p>
                    <select
                      value={linkedDoctorSort}
                      onChange={(event) => setLinkedDoctorSort(event.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none"
                    >
                      <option value="recent">Plus recent</option>
                      <option value="name">Nom</option>
                      <option value="specialty">Specialite</option>
                    </select>
                  </div>
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {sortedLinkedDoctors.length ? (
                      sortedLinkedDoctors.map((entry) => (
                        <div key={entry.appointmentId} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
                          <p className="font-semibold text-slate-900">{entry.doctorName}</p>
                          <p className="text-xs text-slate-500">{entry.specialty || 'Specialite non renseignee'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Aucun medecin relie.</p>
                    )}
                  </div>
                </Card>
              ) : null}

              <Card className="space-y-3 border-slate-200 bg-white">
                <p className="text-sm font-semibold text-slate-900">Envoyer notification (utile pour support et alertes)</p>
                <p className="text-xs text-slate-500">
                  Utilite: contacter rapidement un compte pour confirmation, retard, document manquant ou information urgente.
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <select
                    value={notifyChannel}
                    onChange={(event) => setNotifyChannel(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-med-primary"
                  >
                    <option value="both">SMS + Email</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                  <input
                    value={notifySubject}
                    onChange={(event) => setNotifySubject(event.target.value)}
                    placeholder="Sujet email (optionnel)"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-med-primary"
                  />
                </div>
                <textarea
                  value={notifyMessage}
                  onChange={(event) => setNotifyMessage(event.target.value)}
                  rows={4}
                  placeholder="Saisissez votre message ici..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-med-primary"
                />
              </Card>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/dashboard/admin/accounts/${selectedAccount.id}`)}
                >
                  Voir fiche complete
                </Button>
                <Button
                  className="gap-2"
                  onClick={handleNotifyAccount}
                  disabled={activeAction === `notify-${selectedAccount.id}`}
                >
                  <Send size={14} />
                  {activeAction === `notify-${selectedAccount.id}` ? 'Envoi...' : 'Envoyer notification'}
                </Button>
              </div>
            </>
          ) : (
            <Card className="bg-slate-50/90 text-slate-600">
              Aucun compte disponible.
            </Card>
          )}
        </MotionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <MotionCard className="space-y-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-med-primary" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Médecins en attente de vérification</h2>
              <p className="text-sm text-slate-600">Les comptes médecins non vérifiés sont visibles ici.</p>
            </div>
          </div>

          <div className="space-y-4">
            {verificationQueue.map((doctor) => (
              <Card key={doctor.id} className="space-y-4 bg-slate-50/90">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{doctor.name}</h3>
                      <Badge variant="warning">En attente</Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {formatSpecialtyLabel(doctor.specialty)} - {doctor.city}
                    </p>
                    <p className="text-xs text-slate-500">INPE: {doctor.inpe}</p>
                    <p className="text-xs text-slate-500">Soumis le {new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(doctor.submittedAt))}</p>
                  </div>
                  <ShieldCheck className="text-med-secondary" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {doctor.cabinets.map((cabinet) => (
                    <Badge key={`${doctor.id}-${cabinet}`} variant="info">
                      {cabinet}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-med-primary/20 bg-med-primary/10 px-3 py-2 text-med-primary">
                    <FileText size={14} />
                    {doctor.cinDocument?.fileName
                      ? `CIN: ${doctor.cinDocument.fileName} (${doctor.cinDocument.verificationStatus || 'PENDING'})`
                      : 'CIN: référence non enregistrée'}
                  </div>
                  {doctor.documents.map((document) => (
                    <div key={`${doctor.id}-${document.label}`} className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2">
                      <FileText size={14} className="text-med-primary" />
                      {document.label}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => handleVerifyDoctor(doctor)}
                    disabled={activeAction === `doctor-${doctor.id}`}
                  >
                    <BadgeCheck size={14} />
                    {activeAction === `doctor-${doctor.id}` ? 'Vérification...' : 'Vérifier le médecin'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setExpandedPendingDoctorId((current) => (current === doctor.id ? null : doctor.id))
                    }
                  >
                    {expandedPendingDoctorId === doctor.id ? 'Masquer détails' : 'Voir détails de la demande'}
                  </Button>
                </div>

                {expandedPendingDoctorId === doctor.id ? (
                  <Card className="space-y-4 border-med-primary/20 bg-white">
                    <h4 className="text-sm font-semibold text-slate-900">Dossier complet soumis par le médecin</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Identité</p>
                        <p className="text-sm font-semibold text-slate-900">{doctor.requestDetails.fullName}</p>
                        <p className="text-xs text-slate-600">{doctor.requestDetails.email}</p>
                        <p className="text-xs text-slate-600">{doctor.requestDetails.phone || 'Téléphone non renseigné'}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Références pro</p>
                        <p className="text-sm font-semibold text-slate-900">INPE: {doctor.requestDetails.inpe}</p>
                        <p className="text-xs text-slate-600">Spécialité: {formatSpecialtyLabel(doctor.requestDetails.specialty)}</p>
                        <p className="text-xs text-slate-600">Expérience: {doctor.requestDetails.experience} ans</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Tarification & assurance</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(
                            doctor.requestDetails.fee || 0
                          )}
                        </p>
                        <p className="text-xs text-slate-600">
                          {doctor.requestDetails.acceptsInsurance ? 'Accepte assurance' : 'N accepte pas assurance'}
                        </p>
                        <p className="text-xs text-slate-600">
                          Assurances: {doctor.requestDetails.insuranceList.length ? doctor.requestDetails.insuranceList.join(', ') : 'Aucune précisée'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Langues & diplômes</p>
                        <p className="text-xs text-slate-600">
                          Langues: {doctor.requestDetails.languages.length ? doctor.requestDetails.languages.join(', ') : 'Non renseignées'}
                        </p>
                        <p className="text-xs text-slate-600">
                          Diplômes: {doctor.requestDetails.diplomas.length ? doctor.requestDetails.diplomas.join(', ') : 'Non renseignés'}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Bio</p>
                      <p className="text-sm text-slate-700">{doctor.requestDetails.bio || 'Bio non renseignée'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Cabinets déclarés</p>
                      <p className="text-sm text-slate-700">
                        {doctor.requestDetails.cabinets.length
                          ? doctor.requestDetails.cabinets.map((cab) => `${cab.name} (${cab.city}${cab.district ? `, ${cab.district}` : ''})`).join(' | ')
                          : 'Aucun cabinet déclaré'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Documents fournis</p>
                      <div className="mt-2 space-y-1">
                        {doctor.requestDetails.uploadedDocuments.length ? (
                          doctor.requestDetails.uploadedDocuments.map((doc) => (
                            <p key={doc.id} className="text-xs text-slate-700">
                              {doc.fileName} ({doc.mimeType}, {doc.size} bytes)
                            </p>
                          ))
                        ) : (
                          <p className="text-xs text-slate-600">Aucun document</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ) : null}
              </Card>
            ))}
            {verificationQueue.length === 0 ? (
              <Card className="bg-emerald-50/70 text-emerald-900">
                Aucun dossier médecin en attente.
              </Card>
            ) : null}
          </div>
        </MotionCard>

        <MotionCard className="space-y-5">
          <div className="flex items-center gap-2">
            <Star className="text-med-accent" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Avis à vérifier</h2>
              <p className="text-sm text-slate-600">Les avis non valides sont exposes ici pour moderation.</p>
            </div>
          </div>

          <div className="space-y-4">
            {reviewQueue.map((review) => (
              <Card key={review.id} className="space-y-3 bg-slate-50/90">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{review.doctorName}</h3>
                    <p className="text-sm text-slate-600">Patient: {review.patientName}</p>
                    <p className="text-xs text-slate-500">{review.comment || 'Aucun commentaire'}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={14} fill="currentColor" />
                    <span className="text-sm font-semibold text-slate-700">{review.rating}/5</span>
                  </div>
                </div>
                <Badge variant={review.verified ? 'success' : 'warning'}>
                  {review.verified ? 'Vérifié' : 'En attente de vérification'}
                </Badge>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => handleVerifyReview(review)}
                    disabled={activeAction === `review-${review.id}`}
                  >
                    <CheckCircle2 size={14} />
                    {activeAction === `review-${review.id}` ? 'Validation...' : 'Valider l’avis'}
                  </Button>
                </div>
              </Card>
            ))}
            {reviewQueue.length === 0 ? (
              <Card className="bg-slate-50/90 text-slate-600">
                Aucun avis en attente de modération.
              </Card>
            ) : null}
          </div>
        </MotionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <MotionCard className="space-y-5">
          <div className="flex items-center gap-2">
            <FileText className="text-med-primary" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Demandes de modification médecin</h2>
              <p className="text-sm text-slate-600">Profil et localisation soumis par les médecins pour validation admin.</p>
            </div>
          </div>
          <div className="space-y-3">
            {doctorChangeRequests.map((request) => (
              <Card key={request.id} className="space-y-3 bg-slate-50/90">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{request.doctorName}</p>
                    <p className="text-xs text-slate-500">{request.doctorEmail}</p>
                    <p className="text-sm text-slate-700">{request.type}</p>
                  </div>
                  <Badge variant="warning">PENDING</Badge>
                </div>
                <p className="text-sm text-slate-700">{request.reason}</p>
                <pre className="overflow-x-auto rounded-xl bg-white p-2 text-xs text-slate-600">{JSON.stringify(request.payload, null, 2)}</pre>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleApproveDoctorChangeRequest(request)} disabled={activeAction === `change-approve-${request.id}`}>Approuver</Button>
                  <Button size="sm" variant="outline" onClick={() => handleRejectDoctorChangeRequest(request)} disabled={activeAction === `change-reject-${request.id}`}>Rejeter</Button>
                </div>
              </Card>
            ))}
            {doctorChangeRequests.length === 0 ? (
              <Card className="bg-slate-50/90 text-slate-600">Aucune demande de changement en attente.</Card>
            ) : null}
          </div>
        </MotionCard>

        <MotionCard className="space-y-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-med-primary" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Signaux plateforme</h2>
              <p className="text-sm text-slate-600">Les indicateurs sont calculés depuis les tables de production.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {platformSignals.map((signal) => (
              <div key={signal.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700">{signal.label}</p>
                  <p className="text-lg font-bold text-slate-900">{signal.value}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">{signal.detail}</p>
              </div>
            ))}
          </div>
        </MotionCard>

        <MotionCard className="space-y-5">
          <div className="flex items-center gap-2">
            <UsersRound className="text-med-secondary" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Journal d’activité</h2>
              <p className="text-sm text-slate-600">Derniers événements dérivés de rendez-vous et notifications.</p>
            </div>
          </div>

          <div className="space-y-3">
            {activityLog.map((entry) => (
              <div key={entry} className="flex gap-3 rounded-2xl bg-slate-50/80 p-3 text-sm text-slate-700">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-med-secondary" />
                <p>{entry}</p>
              </div>
            ))}
          </div>
        </MotionCard>
      </section>

    </MotionDiv>
  );
}

export default DashboardAdminPage;
