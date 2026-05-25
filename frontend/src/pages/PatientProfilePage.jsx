import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  MapPin, 
  Droplet, 
  FileText,
  User,
  History,
  CheckCircle2
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import AccountSettingsPanel from '../components/account/AccountSettingsPanel';
import api from '../lib/api';

const resolveImageUrl = (value, profile) => {
  if (!value) {
    if (profile) {
      const text = `${profile.nomComplet || ''} ${profile.email || ''}`.toLowerCase();
      if (/(salma|khadija|fatima|meryem|nadia|laila|sanae|mina|hajar)/.test(text)) {
        return '/assets/avatars/default_female.jpg';
      }
      return '/assets/avatars/default_male.png';
    }
    return undefined;
  }
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
  const [editForm, setEditForm] = useState({
    adresse: '',
    ville: '',
    groupeSanguin: '',
    antecedents: '',
  });

  const profileQuery = useQuery({
    queryKey: ['patient-profile-management'],
    queryFn: async () => {
      const response = await api.get('/patients/me/profile');
      return response.data?.data;
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      setEditForm({
        adresse: profileQuery.data.adresse || '',
        ville: profileQuery.data.ville || '',
        groupeSanguin: profileQuery.data.groupeSanguin || '',
        antecedents: profileQuery.data.antecedents || '',
      });
    }
  }, [profileQuery.data]);

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
      return api.put('/patients/me/profile', {
        adresse: editForm.adresse,
        ville: editForm.ville,
        groupeSanguin: editForm.groupeSanguin || null,
        antecedents: editForm.antecedents || null,
      });
    },
    onSuccess: async () => {
      toast.success("Demande de modification envoyée à l'administrateur.");
      await profileQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Mise à jour impossible.'),
  });

  const reliability = useMemo(() => {
    const warnings = profileQuery.data?.bookingWarnings || 0;
    if (warnings === 0) {
      return {
        label: 'Patient Exemplaire',
        score: 100,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        icon: <ShieldCheck className="h-8 w-8 text-emerald-500" />,
        desc: 'Votre assiduité est excellente. Les médecins privilégient souvent les patients avec un score parfait.',
        tone: 'success'
      };
    } else if (warnings === 1) {
      return {
        label: 'Profil Stable',
        score: 75,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        icon: <Info className="h-8 w-8 text-amber-500" />,
        desc: 'Vous avez un avertissement. Évitez de manquer vos prochains rendez-vous pour maintenir votre accès complet.',
        tone: 'warning'
      };
    } else {
      return {
        label: 'Avertissement Requis',
        score: 40,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
        desc: 'Attention : Plusieurs rendez-vous non honorés. Votre compte pourrait être limité par certains cabinets.',
        tone: 'danger'
      };
    }
  }, [profileQuery.data?.bookingWarnings]);

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const profile = profileQuery.data || {};
  const profilePhotoUrl = profile.id ? `/patients/${profile.id}/profile-photo` : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mon Espace Santé</h1>
            <p className="text-sm text-slate-500">Gérez vos informations et suivez votre fiabilité.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reliability Dashboard */}
          <Card className={`relative overflow-hidden border-none shadow-md ${reliability.bgColor}`}>
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              {reliability.icon}
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Badge tone={reliability.tone} className="px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    {reliability.label}
                  </Badge>
                  <h2 className={`text-3xl font-black ${reliability.color}`}>
                    {reliability.score}% <span className="text-sm font-medium opacity-70">de fiabilité</span>
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500 uppercase">Avertissements</p>
                  <p className={`text-2xl font-black ${profile.bookingWarnings > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {profile.bookingWarnings} / 3
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-700 leading-relaxed max-w-lg">
                {reliability.desc}
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white/60 px-3 py-2 rounded-xl">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Annulation {'>'} 24h gratuite
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white/60 px-3 py-2 rounded-xl">
                  <History className="h-4 w-4 text-med-primary" /> Ponctualité valorisée
                </div>
              </div>
            </div>
          </Card>

          {/* Profile Details */}
          <Card className="shadow-sm border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-med-primary" />
              <h3 className="font-bold text-slate-800">Informations Personnelles</h3>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Adresse de résidence</label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      className="w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:border-med-primary focus:ring-med-primary"
                      placeholder="Votre adresse actuelle"
                      value={editForm.adresse}
                      onChange={(e) => setEditForm((c) => ({ ...c, adresse: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Ville</label>
                  <input
                    className="w-full mt-1 rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-med-primary focus:ring-med-primary"
                    placeholder="Ex: Casablanca"
                    value={editForm.ville}
                    onChange={(e) => setEditForm((c) => ({ ...c, ville: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Groupe Sanguin</label>
                  <div className="relative mt-1">
                    <Droplet className="absolute left-3 top-3 h-4 w-4 text-red-400" />
                    <select
                      className="w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:border-med-primary focus:ring-med-primary appearance-none"
                      value={editForm.groupeSanguin}
                      onChange={(e) => setEditForm((c) => ({ ...c, groupeSanguin: e.target.value }))}
                    >
                      <option value="">Non renseigné</option>
                      <option value="O_POS">O+</option>
                      <option value="O_NEG">O-</option>
                      <option value="A_POS">A+</option>
                      <option value="A_NEG">A-</option>
                      <option value="B_POS">B+</option>
                      <option value="B_NEG">B-</option>
                      <option value="AB_POS">AB+</option>
                      <option value="AB_NEG">AB-</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Antécédents & Allergies</label>
                  <div className="relative mt-1">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      className="w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:border-med-primary focus:ring-med-primary"
                      placeholder="Ex: Diabète, Allergie Penicilline..."
                      value={editForm.antecedents}
                      onChange={(e) => setEditForm((c) => ({ ...c, antecedents: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3">
              <Info className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-800 leading-snug">
                Toute modification de profil nécessite une validation par nos services administratifs. Vos changements seront effectifs sous 24h.
              </p>
            </div>

            <Button
              onClick={() => editProfileMutation.mutate()}
              disabled={editProfileMutation.isPending}
              className="mt-6 w-full py-6 rounded-2xl shadow-lg shadow-med-primary/20"
            >
              {editProfileMutation.isPending ? 'Envoi de la demande...' : 'Mettre à jour mes informations'}
            </Button>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Identity Verification */}
          <Card className="shadow-sm border-slate-100 p-6 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4 overflow-hidden border-4 border-white shadow-md">
              <Avatar src={resolveImageUrl(profilePhotoUrl, profile)} alt="Votre photo" size="2xl" />
            </div>
            <h3 className="font-bold text-slate-900">{profile.user?.email}</h3>
            <p className="text-xs text-slate-500 mb-4">{profile.cin}</p>
            
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3 mb-6">
              <span className="text-xs font-bold text-slate-500 uppercase">Statut CIN</span>
              <Badge tone={profile.cinDocumentVerificationStatus === 'VERIFIED' ? 'success' : 'warning'}>
                {profile.cinDocumentVerificationStatus === 'VERIFIED' ? 'Vérifié' : 'En attente'}
              </Badge>
            </div>

            <div className="space-y-4 text-left">
              <p className="text-xs font-bold text-slate-400 uppercase">Photo de profil</p>
              <div className="space-y-3">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setProfilePhotoFile(event.target.files?.[0] || null)}
                />
                <label 
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {profilePhotoFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={URL.createObjectURL(profilePhotoFile)} className="h-16 w-16 rounded-full object-cover border-2 border-med-primary" alt="Aperçu" />
                      <span className="text-[10px] font-bold text-med-primary truncate max-w-[150px]">{profilePhotoFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <User className="h-6 w-6 text-slate-400 mb-2" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Choisir une photo</span>
                    </>
                  )}
                </label>
                <Button
                  onClick={() => profilePhotoMutation.mutate()}
                  disabled={profilePhotoMutation.isPending || !profilePhotoFile}
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl"
                >
                  {profilePhotoMutation.isPending ? 'Chargement...' : 'Soumettre pour validation'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Tips Card */}
          <Card className="bg-gradient-to-br from-med-primary to-med-secondary text-white p-6 rounded-[2rem] shadow-xl">
            <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Astuces Santé
            </h4>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-[10px] font-bold">1</div>
                <p className="text-xs leading-relaxed opacity-90">Un profil à 100% est traité en priorité par les secrétariats médicaux.</p>
              </li>
              <li className="flex gap-3">
                <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-[10px] font-bold">2</div>
                <p className="text-xs leading-relaxed opacity-90">Vos antécédents permettent au médecin de préparer votre consultation en amont.</p>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <AccountSettingsPanel className="mt-8" />
    </div>
  );
}

export default PatientProfilePage;


