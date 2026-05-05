import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

const roleTone = {
  ADMIN: 'info',
  DOCTOR: 'success',
  PATIENT: 'neutral',
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('fr-MA');
  } catch {
    return '—';
  }
}

function UserProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [consultedDoctorsQuery, setConsultedDoctorsQuery] = useState('');
  const [consultedDoctorsSort, setConsultedDoctorsSort] = useState('recent');
  const [consultedPatientsQuery, setConsultedPatientsQuery] = useState('');
  const [consultedPatientsSort, setConsultedPatientsSort] = useState('recent');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editPayload, setEditPayload] = useState({
    nomComplet: '',
    specialite: '',
    tarifConsultation: '',
    experience: '',
    languesParlees: '',
    diplomes: '',
    accepteAssurance: false,
    assurancesAcceptees: '',
    bio: '',
  });

  const profileQuery = useQuery({
    queryKey: ['user-profile', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const response = await api.get(`/users/${userId}/profile`);
      return response.data?.data;
    },
  });

  useEffect(() => {
    const doctor = profileQuery.data?.doctor;
    if (!doctor) return;
    setEditPayload({
      nomComplet: doctor.nomComplet || '',
      specialite: doctor.specialite || '',
      tarifConsultation: doctor.tarifConsultation ?? '',
      experience: doctor.experience ?? '',
      languesParlees: Array.isArray(doctor.languesParlees) ? doctor.languesParlees.join(', ') : '',
      diplomes: Array.isArray(doctor.diplomes) ? doctor.diplomes.join(', ') : '',
      accepteAssurance: Boolean(doctor.accepteAssurance),
      assurancesAcceptees: Array.isArray(doctor.assurancesAcceptees) ? doctor.assurancesAcceptees.join(', ') : '',
      bio: doctor.bio || '',
    });
  }, [profileQuery.data?.doctor]);

  const updateDoctorMutation = useMutation({
    mutationFn: async () => {
      const doctorId = profileQuery.data?.doctor?.id;
      if (!doctorId) {
        throw new Error('Doctor profile not found');
      }
      const payload = {
        nomComplet: editPayload.nomComplet,
        specialite: editPayload.specialite,
        tarifConsultation: editPayload.tarifConsultation !== '' ? Number(editPayload.tarifConsultation) : undefined,
        experience: editPayload.experience !== '' ? Number(editPayload.experience) : undefined,
        languesParlees: editPayload.languesParlees,
        diplomes: editPayload.diplomes,
        accepteAssurance: Boolean(editPayload.accepteAssurance),
        assurancesAcceptees: editPayload.assurancesAcceptees,
        bio: editPayload.bio,
      };
      const response = await api.put(`/admin/doctors/${doctorId}/profile`, payload);
      return response.data?.data;
    },
    onSuccess: async () => {
      toast.success('Profil public mis à jour.');
      setEditOpen(false);
      await profileQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Mise à jour impossible.'),
  });

  const disableUserMutation = useMutation({
    mutationFn: async () => api.post(`/admin/users/${userId}/disable`),
    onSuccess: async () => {
      toast.success('Compte désactivé.');
      await profileQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Action impossible.'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async () => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      toast.success('Compte supprimé.');
      navigate('/dashboard/admin/users');
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Suppression impossible.'),
  });

  const data = profileQuery.data || {};
  const account = data.account || {};
  const isDoctor = account.role === 'DOCTOR';
  const isPatient = account.role === 'PATIENT';
  const bannerUrl = isDoctor
    ? "https://images.unsplash.com/photo-1580281657702-257584239a55?auto=format&fit=crop&w=1800&q=80"
    : "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=1800&q=80";
  const resolveImageUrl = (value) => {
    if (!value) return undefined;
    if (/^https?:\/\//i.test(value)) return value;
    try {
      return new URL(value, api.defaults.baseURL).toString();
    } catch {
      return undefined;
    }
  };
  const avatarUrl = isDoctor
    ? resolveImageUrl(data.doctor?.profilePhotoUrl)
    : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80';

  const consultedDoctors = Array.isArray(data.consultedDoctors) ? data.consultedDoctors : [];
  const consultedPatients = Array.isArray(data.consultedPatients) ? data.consultedPatients : [];

  const filteredConsultedDoctors = useMemo(() => {
    const query = consultedDoctorsQuery.trim().toLowerCase();
    const filtered = consultedDoctors.filter((entry) => {
      if (!query) return true;
      return [entry.doctorName, entry.specialty, entry.city, entry.reason]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
    if (consultedDoctorsSort === 'name') {
      return [...filtered].sort((a, b) => String(a.doctorName || '').localeCompare(String(b.doctorName || '')));
    }
    return [...filtered].sort((a, b) => {
      const bTime = b.dateTime ? new Date(b.dateTime).getTime() : 0;
      const aTime = a.dateTime ? new Date(a.dateTime).getTime() : 0;
      return bTime - aTime;
    });
  }, [consultedDoctors, consultedDoctorsQuery, consultedDoctorsSort]);

  const filteredConsultedPatients = useMemo(() => {
    const query = consultedPatientsQuery.trim().toLowerCase();
    const filtered = consultedPatients.filter((entry) => {
      if (!query) return true;
      return [entry.patientName, entry.city, entry.reason]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
    if (consultedPatientsSort === 'name') {
      return [...filtered].sort((a, b) => String(a.patientName || '').localeCompare(String(b.patientName || '')));
    }
    return [...filtered].sort((a, b) => {
      const bTime = b.dateTime ? new Date(b.dateTime).getTime() : 0;
      const aTime = a.dateTime ? new Date(a.dateTime).getTime() : 0;
      return bTime - aTime;
    });
  }, [consultedPatients, consultedPatientsQuery, consultedPatientsSort]);

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Card className="space-y-3 border-red-200 bg-red-50/70">
        <h1 className="text-xl font-bold text-red-900">Profil indisponible</h1>
        <p className="text-sm text-red-800">
          Impossible d’afficher ce profil. Vérifiez que vous avez un rendez-vous lié ou que vous êtes administrateur.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" className="gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Retour
        </Button>
        <Badge variant={roleTone[account.role] || 'neutral'}>{account.role}</Badge>
      </div>

      <Card className="overflow-hidden p-0">
        <div
          className="h-40 w-full bg-cover bg-center"
          style={{
            backgroundImage:
              `linear-gradient(rgba(15,23,42,0.62), rgba(15,23,42,0.62)), url('${bannerUrl}')`,
          }}
        />
        <div className="-mt-10 space-y-4 px-5 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-3">
              <div className="rounded-3xl border border-white/70 bg-white p-1 shadow-lg">
                <Avatar src={avatarUrl} name={account.displayName || account.email} size="lg" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">
                  {account.displayName || account.email}
                </h1>
                <p className="text-sm text-slate-600">
                  {account.isVerified ? 'Compte vérifié' : 'Compte en attente'} • Créé le {formatDate(account.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info" className="gap-2">
                <Mail size={14} /> {account.email}
              </Badge>
              {account.phone ? (
                <Badge variant="neutral" className="gap-2">
                  <Phone size={14} /> {account.phone}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card className="space-y-1 bg-slate-50/90">
              <p className="text-xs uppercase tracking-wide text-slate-500">Dernière connexion</p>
              <p className="font-semibold text-slate-900">{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('fr-MA') : '—'}</p>
            </Card>
            <Card className="space-y-1 bg-slate-50/90">
              <p className="text-xs uppercase tracking-wide text-slate-500">Sécurité</p>
              <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck size={16} className="text-med-primary" />
                {account.isVerified ? 'Accès activé' : 'Accès limité'}
              </p>
            </Card>
            <Card className="space-y-1 bg-slate-50/90">
              <p className="text-xs uppercase tracking-wide text-slate-500">Rôle</p>
              <p className="font-semibold text-slate-900">{account.role || '—'}</p>
            </Card>
          </div>
        </div>
      </Card>

      {isDoctor && data.doctor ? (
        <Card className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Stethoscope size={16} className="text-med-primary" /> Profil médecin
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              Modifier profil public
            </Button>
            <Button size="sm" variant="outline" onClick={() => disableUserMutation.mutate()} disabled={disableUserMutation.isPending}>
              Désactiver accès
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeleteOpen(true)} disabled={deleteUserMutation.isPending}>
              Supprimer compte
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (data.doctor?.id) {
                  navigate(`/doctor/${data.doctor.id}`);
                }
              }}
              disabled={!data.doctor?.id}
            >
              Voir le profil public
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50/90 p-3 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-500">Spécialité</p>
              <p className="mt-1 font-semibold text-slate-900">{data.doctor.specialite || '—'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/90 p-3 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-500">Expérience</p>
              <p className="mt-1 font-semibold text-slate-900">{Number.isFinite(data.doctor.experience) ? `${data.doctor.experience} ans` : '—'}</p>
            </div>
          </div>
          {data.doctor.bio ? <p className="text-sm text-slate-700">{data.doctor.bio}</p> : null}
        </Card>
      ) : null}

      {isPatient && data.patient ? (
        <Card className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UsersRound size={16} className="text-med-primary" /> Profil patient
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl bg-slate-50/90 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Ville</p>
              <p className="mt-1 font-semibold text-slate-900">{data.patient.ville || '—'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/90 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Sexe</p>
              <p className="mt-1 font-semibold text-slate-900">{data.patient.sexe || '—'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/90 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Naissance</p>
              <p className="mt-1 font-semibold text-slate-900">{formatDate(data.patient.dateOfNaissance)}</p>
            </div>
          </div>
          {data.patient.antecedents ? <p className="text-sm text-slate-700">{data.patient.antecedents}</p> : null}
        </Card>
      ) : null}

      {isDoctor ? (
        <Card className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UsersRound size={16} className="text-med-primary" /> Patients consultés
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm sm:max-w-xs"
              placeholder="Rechercher un patient, ville, motif..."
              value={consultedPatientsQuery}
              onChange={(event) => setConsultedPatientsQuery(event.target.value)}
            />
            <select
              className="rounded-xl border px-3 py-2 text-sm"
              value={consultedPatientsSort}
              onChange={(event) => setConsultedPatientsSort(event.target.value)}
            >
              <option value="recent">Tri: plus récent</option>
              <option value="name">Tri: nom</option>
            </select>
          </div>
          <div className="space-y-2">
            {filteredConsultedPatients.map((entry) => (
              <div key={entry.appointmentId} className="rounded-2xl bg-slate-50/90 p-3 text-sm text-slate-700">
                <Link
                  to={entry.patientUserId ? `/dashboard/admin/accounts/${entry.patientUserId}` : '#'}
                  className="font-semibold text-slate-900 underline-offset-4 hover:underline"
                >
                  {entry.patientName}
                </Link>
                <p className="text-slate-600">{entry.reason}</p>
              </div>
            ))}
            {!filteredConsultedPatients.length ? <p className="text-sm text-slate-600">Aucun patient consulté.</p> : null}
          </div>
        </Card>
      ) : null}

      {isPatient ? (
        <Card className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Stethoscope size={16} className="text-med-primary" /> Médecins consultés
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm sm:max-w-xs"
              placeholder="Rechercher un médecin, spécialité, ville..."
              value={consultedDoctorsQuery}
              onChange={(event) => setConsultedDoctorsQuery(event.target.value)}
            />
            <select
              className="rounded-xl border px-3 py-2 text-sm"
              value={consultedDoctorsSort}
              onChange={(event) => setConsultedDoctorsSort(event.target.value)}
            >
              <option value="recent">Tri: plus récent</option>
              <option value="name">Tri: nom</option>
            </select>
          </div>
          <div className="space-y-2">
            {filteredConsultedDoctors.map((entry) => (
              <div key={entry.appointmentId} className="rounded-2xl bg-slate-50/90 p-3 text-sm text-slate-700">
                <Link
                  to={entry.doctorUserId ? `/dashboard/admin/accounts/${entry.doctorUserId}` : '#'}
                  className="font-semibold text-slate-900 underline-offset-4 hover:underline"
                >
                  {entry.doctorName}
                </Link>
                <p className="text-slate-600">{entry.specialty || '—'}</p>
              </div>
            ))}
            {!filteredConsultedDoctors.length ? <p className="text-sm text-slate-600">Aucun médecin consulté.</p> : null}
          </div>
        </Card>
      ) : null}

      <Modal isOpen={editOpen} title="Modifier le profil public" onClose={() => setEditOpen(false)}>
        <div className="space-y-3">
          <Input
            id="edit-doctor-name"
            label="Nom complet"
            value={editPayload.nomComplet}
            onChange={(event) => setEditPayload((current) => ({ ...current, nomComplet: event.target.value }))}
          />
          <Input
            id="edit-doctor-specialty"
            label="Spécialité"
            value={editPayload.specialite}
            onChange={(event) => setEditPayload((current) => ({ ...current, specialite: event.target.value }))}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              id="edit-doctor-tarif"
              label="Tarif (MAD)"
              type="number"
              value={editPayload.tarifConsultation}
              onChange={(event) => setEditPayload((current) => ({ ...current, tarifConsultation: event.target.value }))}
            />
            <Input
              id="edit-doctor-experience"
              label="Expérience (ans)"
              type="number"
              value={editPayload.experience}
              onChange={(event) => setEditPayload((current) => ({ ...current, experience: event.target.value }))}
            />
          </div>
          <Input
            id="edit-doctor-languages"
            label="Langues (séparées par des virgules)"
            value={editPayload.languesParlees}
            onChange={(event) => setEditPayload((current) => ({ ...current, languesParlees: event.target.value }))}
          />
          <Input
            id="edit-doctor-diplomas"
            label="Diplômes (séparés par des virgules)"
            value={editPayload.diplomes}
            onChange={(event) => setEditPayload((current) => ({ ...current, diplomes: event.target.value }))}
          />
          <div className="flex items-center gap-2 text-sm">
            <input
              id="edit-doctor-assurance"
              type="checkbox"
              checked={editPayload.accepteAssurance}
              onChange={(event) => setEditPayload((current) => ({ ...current, accepteAssurance: event.target.checked }))}
            />
            <label htmlFor="edit-doctor-assurance">Accepte l'assurance</label>
          </div>
          <Input
            id="edit-doctor-assurance-list"
            label="Assurances acceptées (séparées par des virgules)"
            value={editPayload.assurancesAcceptees}
            onChange={(event) => setEditPayload((current) => ({ ...current, assurancesAcceptees: event.target.value }))}
          />
          <div className="space-y-1">
            <label htmlFor="edit-doctor-bio" className="text-sm font-medium text-slate-700">
              Bio
            </label>
            <textarea
              id="edit-doctor-bio"
              rows={4}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={editPayload.bio}
              onChange={(event) => setEditPayload((current) => ({ ...current, bio: event.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => updateDoctorMutation.mutate()} disabled={updateDoctorMutation.isPending}>
              Enregistrer
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteOpen} title="Supprimer le compte" onClose={() => setDeleteOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Cette action est définitive. Si le compte possède des rendez-vous, la suppression sera refusée.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => deleteUserMutation.mutate()} disabled={deleteUserMutation.isPending}>
              Confirmer la suppression
            </Button>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default UserProfilePage;

