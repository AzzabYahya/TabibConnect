import { useMutation, useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { useState } from 'react';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

function DoctorProfileCabinetPage() {
  const [reason, setReason] = useState('');
  const [locationReason, setLocationReason] = useState('');
  const [locationForm, setLocationForm] = useState({
    nom: '',
    adresse: '',
    ville: '',
    quartier: '',
    latitude: '',
    longitude: '',
    phone: '',
  });
  const [form, setForm] = useState({
    nomComplet: '',
    specialite: '',
    tarifConsultation: '',
    experience: '',
    bio: '',
    languesParlees: '',
    diplomes: '',
  });

  const managementQuery = useQuery({
    queryKey: ['doctor-profile-management'],
    queryFn: async () => {
      const response = await api.get('/doctors/me/profile-management');
      return response.data?.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () =>
      api.post('/doctors/me/change-requests', {
        type: 'PROFILE_UPDATE',
        reason,
        data: {
          nomComplet: form.nomComplet,
          specialite: form.specialite,
          tarifConsultation: Number(form.tarifConsultation || 0),
          experience: Number(form.experience || 0),
          bio: form.bio,
          languesParlees: String(form.languesParlees || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
          diplomes: String(form.diplomes || '')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: async () => {
      toast.success('Demande envoyée à l’admin.');
      setReason('');
      await managementQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Envoi impossible.'),
  });

  const locationMutation = useMutation({
    mutationFn: async () =>
      api.post('/doctors/me/change-requests', {
        type: 'LOCATION_CREATE',
        reason: locationReason,
        data: {
          nom: locationForm.nom,
          adresse: locationForm.adresse,
          ville: locationForm.ville,
          quartier: locationForm.quartier,
          latitude: Number(String(locationForm.latitude).replace(',', '.')),
          longitude: Number(String(locationForm.longitude).replace(',', '.')),
          phone: locationForm.phone,
        },
      }),
    onSuccess: async () => {
      toast.success('Demande de localisation envoyée.');
      setLocationReason('');
      await managementQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Envoi localisation impossible.'),
  });

  if (managementQuery.isLoading) {
    return <Skeleton className="h-80" />;
  }

  const profile = managementQuery.data?.profile || {};
  const cabinets = managementQuery.data?.cabinets || [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Profil (via demande admin)</p>
        <div className="grid gap-2 md:grid-cols-2">
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Nom complet" defaultValue={profile.nomComplet || ''} onChange={(e) => setForm((c) => ({ ...c, nomComplet: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Spécialité" defaultValue={profile.specialite || ''} onChange={(e) => setForm((c) => ({ ...c, specialite: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Tarif (MAD)" defaultValue={profile.tarifConsultation || ''} onChange={(e) => setForm((c) => ({ ...c, tarifConsultation: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Expérience (années)" defaultValue={profile.experience || ''} onChange={(e) => setForm((c) => ({ ...c, experience: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Langues (séparées par virgule)" defaultValue={(profile.languesParlees || []).join(', ')} onChange={(e) => setForm((c) => ({ ...c, languesParlees: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Diplômes (séparés par virgule)" defaultValue={(profile.diplomes || []).join(', ')} onChange={(e) => setForm((c) => ({ ...c, diplomes: e.target.value }))} />
          <textarea className="rounded-xl border px-3 py-2 text-sm md:col-span-2" rows={4} placeholder="Bio" defaultValue={profile.bio || ''} onChange={(e) => setForm((c) => ({ ...c, bio: e.target.value }))} />
          <textarea className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm md:col-span-2" rows={3} placeholder="Motif (obligatoire)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || reason.trim().length < 3}>
          Envoyer la demande à l’admin
        </Button>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Cabinets (vue)</p>
        <div className="space-y-3">
          {cabinets.map((c) => (
            <div key={c.id} className="rounded-2xl bg-slate-50 px-3 py-3">
              <p className="font-semibold text-slate-900">{c.name}</p>
              <p className="text-sm text-slate-600">{c.city} • {c.district}</p>
            </div>
          ))}
          {!cabinets.length ? <p className="text-sm text-slate-600">Aucun cabinet.</p> : null}
        </div>
        <div className="h-64 overflow-hidden rounded-2xl border">
          <MapContainer center={[31.7917, -7.0926]} zoom={5} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {cabinets
              .filter((x) => Number.isFinite(Number(x.latitude)) && Number.isFinite(Number(x.longitude)))
              .map((x) => (
                <CircleMarker
                  key={x.id}
                  center={[Number(x.latitude), Number(x.longitude)]}
                  radius={8}
                  pathOptions={{ color: '#1A6B8A', fillColor: '#2ECC8F', fillOpacity: 0.85 }}
                />
              ))}
          </MapContainer>
        </div>
        <Card className="space-y-2 bg-slate-50/90">
          <p className="text-sm font-semibold text-slate-900">Demande admin — nouvelle localisation cabinet</p>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Nom cabinet" value={locationForm.nom} onChange={(e) => setLocationForm((c) => ({ ...c, nom: e.target.value }))} />
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Téléphone" value={locationForm.phone} onChange={(e) => setLocationForm((c) => ({ ...c, phone: e.target.value }))} />
            <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Adresse" value={locationForm.adresse} onChange={(e) => setLocationForm((c) => ({ ...c, adresse: e.target.value }))} />
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Ville" value={locationForm.ville} onChange={(e) => setLocationForm((c) => ({ ...c, ville: e.target.value }))} />
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Quartier" value={locationForm.quartier} onChange={(e) => setLocationForm((c) => ({ ...c, quartier: e.target.value }))} />
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Latitude" value={locationForm.latitude} onChange={(e) => setLocationForm((c) => ({ ...c, latitude: e.target.value }))} />
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Longitude" value={locationForm.longitude} onChange={(e) => setLocationForm((c) => ({ ...c, longitude: e.target.value }))} />
            <textarea className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm md:col-span-2" rows={3} placeholder="Motif (obligatoire)" value={locationReason} onChange={(e) => setLocationReason(e.target.value)} />
          </div>
          <Button onClick={() => locationMutation.mutate()} disabled={locationMutation.isPending || locationReason.trim().length < 3}>
            Envoyer la demande localisation
          </Button>
        </Card>
      </Card>
    </div>
  );
}

export default DoctorProfileCabinetPage;
