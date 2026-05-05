import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

const resolveImageUrl = (value) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  const base = api.defaults.baseURL.endsWith('/') ? api.defaults.baseURL : `${api.defaults.baseURL}/`;
  const path = value.startsWith('/') ? value.slice(1) : value;
  try {
    return new URL(path, base).toString();
  } catch {
    return undefined;
  }
};

function PatientProfilePage() {
  const navigate = useNavigate();
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [editReason, setEditReason] = useState('');
  const [editForm, setEditForm] = useState({
    adresse: '',
    ville: '',
    groupeSanguin: '',
    antecedents: '',
  });

  const profileQuery = useQuery({
    queryKey: ['patient-profile-management'],
    queryFn: async () => {
      const response = await api.get('/dashboard/patient/profile-management');
      return response.data?.data;
    },
  });

  useEffect(() => {
    if (profileQuery.data?.profile) {
      setEditForm({
        adresse: profileQuery.data.profile.adresse || '',
        ville: profileQuery.data.profile.ville || '',
        groupeSanguin: profileQuery.data.profile.groupeSanguin || '',
        antecedents: profileQuery.data.profile.antecedents || '',
      });
    }
  }, [profileQuery.data?.profile]);

  const profilePhotoMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('profilePhoto', profilePhotoFile);
      return api.post('/patients/me/profile-photo', formData);
    },
    onSuccess: async () => {
      toast.success('Photo envoyée. Validation admin en attente.');
      setProfilePhotoFile(null);
      await profileQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Upload photo impossible.'),
  });

  const editProfileMutation = useMutation({
    mutationFn: async () => {
      return api.post('/dashboard/patient/change-requests', {
        reason: editReason,
        data: {
          adresse: editForm.adresse,
          ville: editForm.ville,
          groupeSanguin: editForm.groupeSanguin || null,
          antecedents: editForm.antecedents || null,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Demande envoyée à l'admin.");
      setEditReason('');
      await profileQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Envoi impossible.'),
  });

  if (profileQuery.isLoading) {
    return <Skeleton className="h-80" />;
  }

  const profile = profileQuery.data?.profile || {};
  const changeRequests = profileQuery.data?.changeRequests || [];
  const profilePhotoUrl = profileQuery.data?.profilePhotoUrl;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 lg:col-span-2">
          <p className="text-sm font-semibold text-slate-900">Informations de profil</p>

          {/* Profile Photo Section */}
          <Card className="space-y-2 border-cyan-200 bg-cyan-50/70">
            <p className="text-sm font-semibold text-slate-900">Photo de profil</p>
            <p className="text-xs text-slate-700">
              Votre photo sera validée par l'administrateur avant d'être affichée partout sur la plateforme.
            </p>
            {profilePhotoUrl && (
              <div className="flex items-center gap-3">
                <Avatar src={resolveImageUrl(profilePhotoUrl)} alt="Votre photo" size="lg" />
                <p className="text-sm text-slate-600">Photo actuelle</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              onChange={(event) => setProfilePhotoFile(event.target.files?.[0] || null)}
            />
            {profilePhotoFile && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
                <img
                  src={URL.createObjectURL(profilePhotoFile)}
                  alt="Aperçu"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <span className="text-sm text-slate-600">{profilePhotoFile.name}</span>
              </div>
            )}
            <Button
              onClick={() => profilePhotoMutation.mutate()}
              disabled={profilePhotoMutation.isPending || !profilePhotoFile}
              className="w-full"
            >
              {profilePhotoMutation.isPending ? 'Envoi...' : 'Ajouter / Modifier ma photo'}
            </Button>
          </Card>

          {/* Edit Profile Section */}
          <Card className="space-y-2 border-amber-200 bg-amber-50/70">
            <p className="text-sm font-semibold text-slate-900">Modifier mes informations</p>
            <p className="text-xs text-slate-700">
              Les modifications seront validées par l'administrateur.
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Adresse"
                defaultValue={profile.adresse || ''}
                onChange={(e) => setEditForm((c) => ({ ...c, adresse: e.target.value }))}
              />
              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Ville"
                defaultValue={profile.ville || ''}
                onChange={(e) => setEditForm((c) => ({ ...c, ville: e.target.value }))}
              />
              <select
                className="rounded-xl border px-3 py-2 text-sm"
                defaultValue={profile.groupeSanguin || ''}
                onChange={(e) => setEditForm((c) => ({ ...c, groupeSanguin: e.target.value }))}
              >
                <option value="">Groupe sanguin</option>
                <option value="O_POS">O+</option>
                <option value="O_NEG">O-</option>
                <option value="A_POS">A+</option>
                <option value="A_NEG">A-</option>
                <option value="B_POS">B+</option>
                <option value="B_NEG">B-</option>
                <option value="AB_POS">AB+</option>
                <option value="AB_NEG">AB-</option>
              </select>
              <input
                className="rounded-xl border px-3 py-2 text-sm"
                placeholder="Antécédents médicaux"
                defaultValue={profile.antecedents || ''}
                onChange={(e) => setEditForm((c) => ({ ...c, antecedents: e.target.value }))}
              />
            </div>
            <textarea
              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm"
              rows={3}
              placeholder="Motif de modification (obligatoire)"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
            />
            <Button
              onClick={() => editProfileMutation.mutate()}
              disabled={editProfileMutation.isPending || editReason.trim().length < 3}
              className="w-full"
            >
              {editProfileMutation.isPending ? 'Envoi...' : 'Envoyer la demande de modification'}
            </Button>
          </Card>
        </Card>

        {/* Change Requests History */}
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">Demandes en attente</p>
          {changeRequests.length === 0 ? (
            <p className="text-sm text-slate-600">Aucune demande en attente.</p>
          ) : (
            <div className="space-y-2">
              {changeRequests.map((request) => (
                <Card key={request.id} className="space-y-1 border-l-4 border-l-yellow-400 bg-yellow-50 p-3">
                  <p className="text-xs font-semibold text-slate-900">{request.reason}</p>
                  <Badge tone={request.status === 'REJECTED' ? 'destructive' : 'warning'}>
                    {request.status === 'PENDING' ? 'En attente' : request.status === 'APPROVED' ? 'Approuvée' : 'Rejetée'}
                  </Badge>
                  {request.rejectionReason && (
                    <p className="text-xs text-slate-700">Motif du rejet: {request.rejectionReason}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {new Date(request.createdAt).toLocaleDateString('fr-MA')}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default PatientProfilePage;
