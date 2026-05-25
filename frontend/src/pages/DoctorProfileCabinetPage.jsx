import { useMutation, useQuery } from '@tanstack/react-query';
import { TileLayer, CircleMarker, Marker, useMapEvents, useMap } from 'react-leaflet';
import SafeMapContainer from '../components/common/SafeMapContainer';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import L from 'leaflet';
import { Search, MapPin, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import Avatar from '../components/ui/Avatar';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Sub-component to handle map clicks
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
}

// Sub-component to handle map centering
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 16);
    }
  }, [center, map]);
  return null;
}

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
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  
  // Geocoding search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState([33.5731, -7.5898]); // Default to Casablanca

  const handleMapClick = (latlng) => {
    setLocationForm(prev => ({
      ...prev,
      latitude: latlng.lat.toFixed(6),
      longitude: latlng.lng.toFixed(6)
    }));
  };

  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newPos = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setMapCenter([newPos.lat, newPos.lng]);
        handleMapClick(newPos);
        toast.success('Lieu trouvé');
        
        // Try to pre-fill address/city if possible
        if (display_name) {
          const parts = display_name.split(', ');
          if (parts.length > 0) setLocationForm(prev => ({ ...prev, adresse: parts[0] }));
          if (parts.length > 1) setLocationForm(prev => ({ ...prev, quartier: parts[1] }));
          // Note: city is usually further back in the parts array
        }
      } else {
        toast.error('Aucun lieu trouvé pour cette recherche');
      }
    } catch (error) {
      toast.error('Erreur lors de la recherche');
    } finally {
      setIsSearching(false);
    }
  };

  const managementQuery = useQuery({
    queryKey: ['doctor-profile-management'],
    queryFn: async () => {
      const response = await api.get('/doctors/me/profile-management');
      return response.data?.data;
    },
  });

  useEffect(() => {
    if (managementQuery.data?.profile) {
      const p = managementQuery.data.profile;
      setForm({
        nomComplet: p.nomComplet || '',
        specialite: p.specialite || '',
        tarifConsultation: p.tarifConsultation || '',
        experience: p.experience || '',
        bio: p.bio || '',
        languesParlees: (p.languesParlees || []).join(', '),
        diplomes: (p.diplomes || []).join(', '),
      });
    }
  }, [managementQuery.data]);


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
      setLocationForm({
        nom: '',
        adresse: '',
        ville: '',
        quartier: '',
        latitude: '',
        longitude: '',
        phone: '',
      });
      await managementQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Envoi localisation impossible.'),
  });

  const profilePhotoMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('profilePhoto', profilePhotoFile);
      return api.post('/doctors/me/profile-photo', formData);
    },
    onSuccess: async () => {
      toast.success('Photo envoyée. Validation admin en attente.');
      setProfilePhotoFile(null);
      await managementQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Upload photo impossible.'),
  });

  if (managementQuery.isLoading) {
    return <Skeleton className="h-80" />;
  }

  const profile = managementQuery.data?.profile || {};
  const cabinets = managementQuery.data?.cabinets || [];
  const selectedPos = locationForm.latitude && locationForm.longitude 
    ? { lat: parseFloat(locationForm.latitude), lng: parseFloat(locationForm.longitude) } 
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Profil (via demande admin)</p>
        <Card className="space-y-2 border-cyan-200 bg-cyan-50/70">
          <p className="text-sm font-semibold text-slate-900">Photo de profil médecin</p>
          <p className="text-xs text-slate-700">
            Obligatoire. Toute photo ajoutée ou modifiée doit être validée par l'administrateur.
          </p>
          {managementQuery.data?.profilePhotoUrl && (
            <div className="flex items-center gap-3">
              <Avatar src={resolveImageUrl(managementQuery.data.profilePhotoUrl, managementQuery.data)} alt="Votre photo" size="lg" />
              <p className="text-sm text-slate-600">Photo actuelle</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            onChange={(event) => setProfilePhotoFile(event.target.files?.[0] || null)}
          />
          <Button
            onClick={() => profilePhotoMutation.mutate()}
            disabled={profilePhotoMutation.isPending || !profilePhotoFile}
          >
            {profilePhotoMutation.isPending ? 'Envoi...' : 'Ajouter / Modifier ma photo'}
          </Button>
        </Card>
        <div className="grid gap-2 md:grid-cols-2">
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Nom complet" value={form.nomComplet} onChange={(e) => setForm((c) => ({ ...c, nomComplet: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Spécialité" value={form.specialite} onChange={(e) => setForm((c) => ({ ...c, specialite: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Tarif (MAD)" value={form.tarifConsultation} onChange={(e) => setForm((c) => ({ ...c, tarifConsultation: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Expérience (années)" value={form.experience} onChange={(e) => setForm((c) => ({ ...c, experience: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Langues (séparées par virgule)" value={form.languesParlees} onChange={(e) => setForm((c) => ({ ...c, languesParlees: e.target.value }))} />
          <input className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Diplômes (séparés par virgule)" value={form.diplomes} onChange={(e) => setForm((c) => ({ ...c, diplomes: e.target.value }))} />
          <textarea className="rounded-xl border px-3 py-2 text-sm md:col-span-2" rows={4} placeholder="Bio" value={form.bio} onChange={(e) => setForm((c) => ({ ...c, bio: e.target.value }))} />
          <textarea className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm md:col-span-2" rows={3} placeholder="Motif (minimum 5 caractères)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || reason.trim().length < 5}>
          Envoyer la demande à l’admin
        </Button>

      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Gestion des cabinets</p>
        
        {/* Search Bar for Map */}
        <form onSubmit={handleSearchLocation} className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm focus:border-med-primary focus:ring-1 focus:ring-med-primary"
              placeholder="Rechercher une adresse (ex: 123 Rue Rabat...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" className="gap-2" disabled={isSearching}>
            {isSearching ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
            Chercher
          </Button>
        </form>

        <div className="relative h-64 overflow-hidden rounded-2xl border group">
          <SafeMapContainer mapKey="doctor-cabinet-profile-map" center={mapCenter} zoom={5} scrollWheelZoom className="h-full w-full">
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ChangeView center={mapCenter} />
            <LocationMarker position={selectedPos} setPosition={handleMapClick} />
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
          </SafeMapContainer>
          <div className="absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/90 px-3 py-1.5 text-[10px] font-medium text-slate-600 shadow-sm backdrop-blur-sm border border-slate-200 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            Cliquez sur la carte pour définir la position
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mes cabinets actuels</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {cabinets.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-3 transition-colors hover:bg-slate-100">
                <p className="font-bold text-sm text-slate-900">{c.name}</p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{c.address}</p>
                <p className="text-[11px] font-semibold text-med-primary mt-1">{c.city} • {c.district}</p>
              </div>
            ))}
          </div>
          {!cabinets.length ? <p className="text-sm text-slate-400 italic">Aucun cabinet enregistré.</p> : null}
        </div>

        <Card className="space-y-3 bg-med-primary/5 border-med-primary/10">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-med-primary/10 p-1.5">
              <MapPin className="text-med-primary" size={16} />
            </div>
            <p className="text-sm font-bold text-slate-900">Nouvelle localisation</p>
          </div>
          
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Nom du cabinet" value={locationForm.nom} onChange={(e) => setLocationForm((c) => ({ ...c, nom: e.target.value }))} />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Téléphone cabinet" value={locationForm.phone} onChange={(e) => setLocationForm((c) => ({ ...c, phone: e.target.value }))} />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-2" placeholder="Adresse complète" value={locationForm.adresse} onChange={(e) => setLocationForm((c) => ({ ...c, adresse: e.target.value }))} />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Ville" value={locationForm.ville} onChange={(e) => setLocationForm((c) => ({ ...c, ville: e.target.value }))} />
            <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Quartier" value={locationForm.quartier} onChange={(e) => setLocationForm((c) => ({ ...c, quartier: e.target.value }))} />
            <div className="relative">
              <input className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-mono text-slate-500" placeholder="Lat" value={locationForm.latitude} readOnly />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Lat</span>
            </div>
            <div className="relative">
              <input className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-mono text-slate-500" placeholder="Lng" value={locationForm.longitude} readOnly />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Lng</span>
            </div>
            <textarea className="rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm md:col-span-2 focus:ring-1 focus:ring-amber-500 outline-none" rows={2} placeholder="Motif de la demande (ex: Déménagement, nouveau cabinet...)" value={locationReason} onChange={(e) => setLocationReason(e.target.value)} />
          </div>
          <Button 
            onClick={() => locationMutation.mutate()} 
            disabled={locationMutation.isPending || locationReason.trim().length < 3 || !locationForm.latitude}
            className="w-full"
          >
            {locationMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
            Envoyer la demande de création
          </Button>
        </Card>
      </Card>
    </div>
  );
}

export default DoctorProfileCabinetPage;

