import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  ArrowUpDown,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
  UsersRound,
  Video,
  XCircle,
} from 'lucide-react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import MotionCard from '../components/ui/MotionCard';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import { formatSpecialtyLabel } from '../lib/frenchText';
import { MOROCCO_CITY_SELECT_OPTIONS } from '../lib/moroccoCities';

const MotionDiv = motion.div;

const summaryTone = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  neutral: 'neutral',
};

const statusTone = {
  EN_ATTENTE: 'warning',
  CONFIRME: 'success',
  COMPLETE: 'info',
  ANNULE: 'neutral',
  NO_SHOW: 'warning',
};

const mapDefaultCenter = [31.7917, -7.0926];

function LocationPickerEvents({ onPick }) {
  useMapEvents({
    click: (event) => {
      const lat = Number(event.latlng.lat.toFixed(6));
      const lng = Number(event.latlng.lng.toFixed(6));
      onPick(lat, lng);
    },
  });
  return null;
}

function LocationPickerRecenter({ latitude, longitude, zoom = 14 }) {
  const map = useMap();
  const lat = Number(latitude);
  const lng = Number(longitude);

  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.setView([lat, lng], zoom, { animate: true });
    }
  }, [lat, lng, map, zoom]);

  return null;
}

function LocationPickerMap({ latitude, longitude, onPick }) {
  const selectedLat = Number(latitude);
  const selectedLng = Number(longitude);
  const hasSelectedPoint = Number.isFinite(selectedLat) && Number.isFinite(selectedLng);
  const center = hasSelectedPoint ? [selectedLat, selectedLng] : mapDefaultCenter;
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);

  const handleSearchLocation = async () => {
    const query = locationQuery.trim();
    if (!query) return;
    try {
      setLocationSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ma&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );
      const data = await response.json();
      const first = Array.isArray(data) ? data[0] : null;
      if (!first) return;
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        onPick(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      }
    } finally {
      setLocationSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={locationQuery}
          onChange={(event) => setLocationQuery(event.target.value)}
          placeholder="Rechercher une adresse ou un quartier..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSearchLocation}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          {locationSearching ? '...' : 'Rechercher'}
        </button>
      </div>
      <div className="h-64 overflow-hidden rounded-xl border border-slate-200">
        <MapContainer center={center} zoom={hasSelectedPoint ? 14 : 6} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPickerEvents onPick={onPick} />
          <LocationPickerRecenter latitude={latitude} longitude={longitude} />
          {hasSelectedPoint ? (
            <CircleMarker
              center={[selectedLat, selectedLng]}
              radius={10}
              pathOptions={{ color: '#1A6B8A', fillColor: '#2ECC8F', fillOpacity: 0.85 }}
            />
          ) : null}
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500">
        Cliquez sur la carte pour choisir la localisation exacte du cabinet.
      </p>
    </div>
  );
}

const fallbackDoctorDashboard = {
  doctor: {},
  summary: {},
  cabinets: [],
  todayPatients: [],
  pendingRequests: [],
  upcomingAppointments: [],
  patientDirectory: [],
  recentReviews: [],
  publicProfile: {},
};

function DashboardDoctorPage() {
  const navigate = useNavigate();
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSort, setPatientSort] = useState('recent');
  const [profileForm, setProfileForm] = useState({
    nomComplet: '',
    specialite: '',
    tarifConsultation: '',
    experience: '',
    bio: '',
    languesParlees: '',
    diplomes: '',
  });
  const [profileChangeReason, setProfileChangeReason] = useState('');
  const [locationRequestForm, setLocationRequestForm] = useState({
    mode: 'LOCATION_CREATE',
    cabinetId: '',
    nom: '',
    adresse: '',
    ville: '',
    quartier: '',
    latitude: '',
    longitude: '',
    phone: '',
    reason: '',
  });
  const [availabilityForm, setAvailabilityForm] = useState({
    cabinetId: '',
    jourSemaine: 'LUNDI',
    heureDebut: '09:00',
    heureFin: '12:00',
    dureeConsultation: '30',
    isActive: true,
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [availabilitySubmitting, setAvailabilitySubmitting] = useState(false);
  const [editingAvailabilityId, setEditingAvailabilityId] = useState(null);
  const [availabilityEditForm, setAvailabilityEditForm] = useState({
    jourSemaine: 'LUNDI',
    heureDebut: '09:00',
    heureFin: '12:00',
    dureeConsultation: '30',
    isActive: true,
  });
  const [editingChangeRequestId, setEditingChangeRequestId] = useState(null);

  const dashboardQuery = useQuery({
    queryKey: ['doctor-dashboard'],
    staleTime: 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await api.get('/dashboard/doctor');
      return response.data?.data || fallbackDoctorDashboard;
    },
  });
  const doctorChangeRequestsQuery = useQuery({
    queryKey: ['doctor-change-requests'],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const response = await api.get('/doctors/me/change-requests');
      return response.data?.data || [];
    },
  });

  const refreshDashboard = async () => {
    await dashboardQuery.refetch();
  };

  const dashboard = dashboardQuery.data || fallbackDoctorDashboard;
  const doctor = dashboard.doctor || {};
  const summary = dashboard.summary || {};
  const cabinets = dashboard.cabinets || [];
  const todayPatients = dashboard.todayPatients || [];
  const pendingRequests = dashboard.pendingRequests || [];
  const patientDirectory = dashboard.patientDirectory || [];
  const recentReviews = dashboard.recentReviews || [];
  const publicProfile = dashboard.publicProfile || {};
  const firstCabinetId = cabinets[0]?.id || '';
  const profileInitialValues = {
    nomComplet: publicProfile.nomComplet || doctor.name || '',
    specialite: publicProfile.specialite || doctor.specialty || '',
    tarifConsultation: String(publicProfile.tarifConsultation || doctor.consultationFee || ''),
    experience: String(publicProfile.experience || doctor.experience || ''),
    bio: publicProfile.bio || doctor.bio || '',
    languesParlees: (publicProfile.languesParlees || doctor.languages || []).join(', '),
    diplomes: (publicProfile.diplomes || []).join(', '),
  };

  const handleConfirmAppointment = async (appointment) => {
    try {
      await api.put(`/appointments/${appointment.id}/confirm`);
      toast.success(`Rendez-vous confirme pour ${appointment.patientName}.`);
      await refreshDashboard();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible de confirmer ce rendez-vous.');
    }
  };

  const handleCancelAppointment = async (appointment) => {
    const reason = window.prompt(`Raison d’annulation pour ${appointment.patientName}`);

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await api.put(`/appointments/${appointment.id}/cancel`, { reason });
      toast.success(`Rendez-vous annule pour ${appointment.patientName}.`);
      await refreshDashboard();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible d annuler ce rendez-vous.');
    }
  };

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`doctor-summary-${index + 1}`} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <Card className="space-y-4 border-red-200 bg-red-50/70">
        <Badge variant="warning">Dashboard médecin indisponible</Badge>
        <h1 className="text-2xl font-bold text-red-900">Impossible de charger l’espace médecin</h1>
        <p className="text-sm text-red-800">
          Vérifiez votre session ou reconnectez-vous pour accéder aux données du backend.
        </p>
        <Button onClick={() => navigate('/connexion')}>
          Aller à la connexion
        </Button>
      </Card>
    );
  }

  const filteredPatients = [...patientDirectory]
    .filter((patient) => {
      const q = patientSearch.trim().toLowerCase();
      if (!q) {
        return true;
      }
      return (
        String(patient.name || '').toLowerCase().includes(q)
        || String(patient.email || '').toLowerCase().includes(q)
        || String(patient.phone || '').toLowerCase().includes(q)
      );
    })
    .sort((left, right) => {
      if (patientSort === 'name') {
        return String(left.name || '').localeCompare(String(right.name || ''));
      }
      if (patientSort === 'visits') {
        return (right.appointmentsCount || 0) - (left.appointmentsCount || 0);
      }
      return new Date(right.lastVisit || 0).getTime() - new Date(left.lastVisit || 0).getTime();
    });

  const handleProfileFormChange = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const handleAvailabilityFormChange = (field, value) => {
    setAvailabilityForm((current) => ({ ...current, [field]: value }));
  };

  const handleSaveDoctorProfile = async () => {
    if (!profileChangeReason.trim()) {
      toast.error('Veuillez saisir la raison de modification pour l admin.');
      return;
    }
    try {
      setProfileSubmitting(true);
      const endpoint = editingChangeRequestId
        ? `/doctors/me/change-requests/${editingChangeRequestId}`
        : '/doctors/me/change-requests';
      const method = editingChangeRequestId ? 'put' : 'post';
      await api[method](endpoint, {
        type: 'PROFILE_UPDATE',
        reason: profileChangeReason,
        data: {
          nomComplet: profileForm.nomComplet || profileInitialValues.nomComplet,
          specialite: profileForm.specialite || profileInitialValues.specialite,
          tarifConsultation: Number(profileForm.tarifConsultation || profileInitialValues.tarifConsultation || 0),
          experience: Number(profileForm.experience || profileInitialValues.experience || 0),
          bio: profileForm.bio || profileInitialValues.bio,
          languesParlees: String(profileForm.languesParlees || profileInitialValues.languesParlees)
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          diplomes: String(profileForm.diplomes || profileInitialValues.diplomes)
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });
      toast.success(editingChangeRequestId ? 'Demande modifiée.' : 'Demande de modification envoyée à l administrateur.');
      setProfileChangeReason('');
      setEditingChangeRequestId(null);
      await doctorChangeRequestsQuery.refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible d envoyer la demande.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleSubmitLocationRequest = async () => {
    if (!locationRequestForm.reason.trim()) {
      toast.error('Veuillez saisir la cause de la demande de localisation.');
      return;
    }
    const lat = Number(String(locationRequestForm.latitude).replace(',', '.'));
    const lng = Number(String(locationRequestForm.longitude).replace(',', '.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error('Veuillez choisir une localisation valide sur la carte.');
      return;
    }
    try {
      setProfileSubmitting(true);
      const endpoint = editingChangeRequestId
        ? `/doctors/me/change-requests/${editingChangeRequestId}`
        : '/doctors/me/change-requests';
      const method = editingChangeRequestId ? 'put' : 'post';
      await api[method](endpoint, {
        type: locationRequestForm.mode,
        reason: locationRequestForm.reason,
        data: {
          cabinetId: locationRequestForm.mode === 'LOCATION_UPDATE' ? locationRequestForm.cabinetId : undefined,
          nom: locationRequestForm.nom,
          adresse: locationRequestForm.adresse,
          ville: locationRequestForm.ville,
          quartier: locationRequestForm.quartier,
          latitude: lat,
          longitude: lng,
          phone: locationRequestForm.phone,
        },
      });
      toast.success(editingChangeRequestId ? 'Demande modifiée.' : 'Demande de localisation envoyée à l administrateur.');
      setLocationRequestForm((current) => ({ ...current, reason: '' }));
      setEditingChangeRequestId(null);
      await doctorChangeRequestsQuery.refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Envoi de la demande impossible.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleCancelSentRequest = async (request) => {
    try {
      await api.delete(`/doctors/me/change-requests/${request.id}`);
      toast.success('Demande annulée.');
      if (editingChangeRequestId === request.id) {
        setEditingChangeRequestId(null);
      }
      await doctorChangeRequestsQuery.refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible d annuler cette demande.');
    }
  };

  const handleEditSentRequest = (request) => {
    if (request.status !== 'PENDING') {
      toast.error('Seules les demandes en attente peuvent être modifiées.');
      return;
    }
    setEditingChangeRequestId(request.id);
    if (request.type === 'PROFILE_UPDATE') {
      const data = request.payload || {};
      setProfileForm({
        nomComplet: data.nomComplet || '',
        specialite: data.specialite || '',
        tarifConsultation: String(data.tarifConsultation || ''),
        experience: String(data.experience || ''),
        bio: data.bio || '',
        languesParlees: Array.isArray(data.languesParlees) ? data.languesParlees.join(', ') : '',
        diplomes: Array.isArray(data.diplomes) ? data.diplomes.join(', ') : '',
      });
      setProfileChangeReason(request.reason || '');
      toast.success('Demande chargée dans le formulaire profil.');
      return;
    }

    const data = request.payload || {};
    setLocationRequestForm({
      mode: request.type,
      cabinetId: data.cabinetId || '',
      nom: data.nom || '',
      adresse: data.adresse || '',
      ville: data.ville || '',
      quartier: data.quartier || '',
      latitude: String(data.latitude || ''),
      longitude: String(data.longitude || ''),
      phone: data.phone || '',
      reason: request.reason || '',
    });
    toast.success('Demande chargée dans le formulaire localisation.');
  };

  const handleCreateAvailability = async () => {
    try {
      setAvailabilitySubmitting(true);
      await api.post('/doctors/me/availabilities', {
        cabinetId: availabilityForm.cabinetId || firstCabinetId,
        jourSemaine: availabilityForm.jourSemaine,
        heureDebut: availabilityForm.heureDebut,
        heureFin: availabilityForm.heureFin,
        dureeConsultation: Number(availabilityForm.dureeConsultation),
        isActive: Boolean(availabilityForm.isActive),
      });
      toast.success('Disponibilité ajoutée.');
      await refreshDashboard();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible d ajouter la disponibilité.');
    } finally {
      setAvailabilitySubmitting(false);
    }
  };

  const handleDeleteAvailability = async (availabilityId) => {
    try {
      setAvailabilitySubmitting(true);
      await api.delete(`/doctors/me/availabilities/${availabilityId}`);
      toast.success('Créneau supprimé.');
      if (editingAvailabilityId === availabilityId) {
        setEditingAvailabilityId(null);
      }
      await refreshDashboard();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Suppression impossible.');
    } finally {
      setAvailabilitySubmitting(false);
    }
  };

  const handleStartEditAvailability = (block) => {
    setEditingAvailabilityId(block.id);
    setAvailabilityEditForm({
      jourSemaine: block.day,
      heureDebut: block.start,
      heureFin: block.end,
      dureeConsultation: String(block.duration),
      isActive: Boolean(block.active),
    });
  };

  const handleSaveAvailabilityEdit = async (availabilityId) => {
    try {
      setAvailabilitySubmitting(true);
      await api.put(`/doctors/me/availabilities/${availabilityId}`, {
        jourSemaine: availabilityEditForm.jourSemaine,
        heureDebut: availabilityEditForm.heureDebut,
        heureFin: availabilityEditForm.heureFin,
        dureeConsultation: Number(availabilityEditForm.dureeConsultation),
        isActive: Boolean(availabilityEditForm.isActive),
      });
      toast.success('Créneau modifié.');
      setEditingAvailabilityId(null);
      await refreshDashboard();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Modification impossible.');
    } finally {
      setAvailabilitySubmitting(false);
    }
  };

  const summaryCards = [
    {
      label: 'RDV du jour',
      value: summary.todayAppointments || 0,
      detail: 'consultations à suivre aujourd’hui',
      icon: UsersRound,
      tone: 'info',
    },
    {
      label: 'Demandes en attente',
      value: summary.pendingRequests || 0,
      detail: 'rendez-vous à confirmer',
      icon: Clock3,
      tone: 'warning',
    },
    {
      label: 'Revenus du mois',
      value: new Intl.NumberFormat('fr-MA', {
        style: 'currency',
        currency: 'MAD',
        maximumFractionDigits: 0,
      }).format(summary.monthlyRevenue || 0),
      detail: 'paiements effectifs en base',
      icon: DollarSign,
      tone: 'success',
    },
    {
      label: 'Disponibilités actives',
      value: summary.activeAvailabilities || 0,
      detail: 'créneaux publiés en base',
      icon: CalendarDays,
      tone: 'neutral',
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
        <Badge variant="success">Espace médecin alimenté par la base</Badge>
        <div
          className="h-36 w-full rounded-3xl bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.46), rgba(15,23,42,0.46)), url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=80')",
          }}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Dashboard Médecin</h1>
            <p className="max-w-3xl text-slate-600">
              Vos rendez-vous, vos cabinets et vos disponibilités sont lus depuis la base de données.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <p className="font-semibold text-slate-900">{doctor.name || 'Médecin'}</p>
            <p>{formatSpecialtyLabel(doctor.specialty || 'Spécialité non renseignée')}</p>
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

      <section className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <MotionCard className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="text-med-primary" size={18} />
                <h2 className="text-xl font-bold text-slate-900">Cabinets et disponibilités</h2>
              </div>
              <p className="text-sm text-slate-600">
                Les plages ci-dessous sont lues dans la table <span className="font-semibold">Disponibilité</span>.
              </p>
            </div>
            <Badge variant="info">{cabinets.length} cabinets</Badge>
          </div>

          <div className="space-y-4">
            {cabinets.map((cabinet) => (
              <Card key={cabinet.id} className="space-y-4 bg-slate-50/90">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{cabinet.name}</h3>
                    <p className="text-sm text-slate-600">
                      {cabinet.city} - {cabinet.quartier}
                    </p>
                    <p className="text-xs text-slate-500">{cabinet.address}</p>
                  </div>
                  <Badge variant={cabinet.teleconsultation ? 'info' : 'neutral'}>
                    {cabinet.teleconsultation ? 'Teleconsultation' : 'Présentiel'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {cabinet.availabilityBlocks.map((block) => (
                    <div key={block.id} className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700">
                      {editingAvailabilityId === block.id ? (
                        <div className="grid gap-2 md:grid-cols-6">
                          <select className="rounded-lg border border-slate-200 px-2 py-1 text-xs" value={availabilityEditForm.jourSemaine} onChange={(e) => setAvailabilityEditForm((c) => ({ ...c, jourSemaine: e.target.value }))}>
                            {['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'].map((day) => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                          <input type="time" className="rounded-lg border border-slate-200 px-2 py-1 text-xs" value={availabilityEditForm.heureDebut} onChange={(e) => setAvailabilityEditForm((c) => ({ ...c, heureDebut: e.target.value }))} />
                          <input type="time" className="rounded-lg border border-slate-200 px-2 py-1 text-xs" value={availabilityEditForm.heureFin} onChange={(e) => setAvailabilityEditForm((c) => ({ ...c, heureFin: e.target.value }))} />
                          <input className="rounded-lg border border-slate-200 px-2 py-1 text-xs" value={availabilityEditForm.dureeConsultation} onChange={(e) => setAvailabilityEditForm((c) => ({ ...c, dureeConsultation: e.target.value }))} placeholder="Durée" />
                          <label className="inline-flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={availabilityEditForm.isActive} onChange={(e) => setAvailabilityEditForm((c) => ({ ...c, isActive: e.target.checked }))} />
                            Actif
                          </label>
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => handleSaveAvailabilityEdit(block.id)} disabled={availabilitySubmitting}>Sauver</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingAvailabilityId(null)}>Annuler</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={block.active ? 'success' : 'neutral'}>{block.day}</Badge>
                            <span>{block.start} - {block.end}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{block.duration} min</span>
                            <Button size="sm" variant="outline" onClick={() => handleStartEditAvailability(block)}>Modifier</Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteAvailability(block.id)} disabled={availabilitySubmitting}>Supprimer</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {cabinet.availabilityBlocks.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                      Aucune disponibilité active dans ce cabinet.
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </MotionCard>

        <MotionCard className="space-y-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-med-secondary" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Rendez-vous à traiter</h2>
              <p className="text-sm text-slate-600">Les confirmations et annulations passent par les vraies routes API.</p>
            </div>
          </div>

          <div className="space-y-4">
            {pendingRequests.map((appointment) => (
              <Card key={appointment.id} className="space-y-4 bg-slate-50/90">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{appointment.patientName}</h3>
                    <p className="text-sm text-slate-600">{appointment.reason}</p>
                    <p className="text-xs text-slate-500">{appointment.appointmentTime} - {appointment.room}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusTone[appointment.status] || 'neutral'}>{appointment.status}</Badge>
                    {appointment.patientWarnings > 0 ? (
                      <Badge variant="warning">Avertissement patient: {appointment.patientWarnings}</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button className="gap-2" onClick={() => handleConfirmAppointment(appointment)}>
                    <CheckCircle2 size={14} /> Confirmer
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => handleCancelAppointment(appointment)}>
                    <XCircle size={14} /> Annuler
                  </Button>
                  <Button variant="ghost" className="gap-2" onClick={() => navigate(`/appointment/${appointment.id}`)}>
                    <FileText size={14} /> Ouvrir
                  </Button>
                </div>
              </Card>
            ))}
            {pendingRequests.length === 0 ? (
              <Card className="bg-emerald-50/70 text-emerald-900">
                Aucun rendez-vous en attente pour le moment.
              </Card>
            ) : null}
          </div>
        </MotionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <MotionCard className="space-y-5">
          <div className="flex items-center gap-2">
            <UsersRound className="text-med-primary" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Patients du jour</h2>
              <p className="text-sm text-slate-600">Les cartes ci-dessous reflètent les rendez-vous du jour stockés.</p>
            </div>
          </div>

          <div className="space-y-4">
            {todayPatients.map((patient) => (
              <Card key={patient.id} className="space-y-4 bg-slate-50/90">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={patient.patientName} size="md" />
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-slate-900">{patient.patientName}</h3>
                      <p className="text-sm text-slate-600">
                        {patient.age !== null ? `${patient.age} ans` : 'Âge non renseigné'} - {patient.reason}
                      </p>
                      <p className="text-xs text-slate-500">{patient.city} - {patient.room}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusTone[patient.status] || 'neutral'}>{patient.status}</Badge>
                    {patient.patientWarnings > 0 ? (
                      <Badge variant="warning">Avertissement patient: {patient.patientWarnings}</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <p className="inline-flex items-center gap-2">
                    <Clock3 size={14} className="text-med-primary" />
                    {patient.appointmentTime}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <ShieldCheck size={14} className="text-med-primary" />
                    {patient.allergies}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <Video size={14} className="text-med-primary" />
                    {patient.type}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <MapPin size={14} className="text-med-primary" />
                    {patient.room}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-2" onClick={() => navigate(`/appointment/${patient.id}`)}>
                    <MessageSquare size={14} /> Détail
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </MotionCard>

        <MotionCard className="space-y-5">
          <div className="flex items-center gap-2">
            <Star className="text-med-accent" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Avis récents</h2>
              <p className="text-sm text-slate-600">Les avis affiches proviennent de la table <span className="font-semibold">Avis</span>.</p>
            </div>
          </div>

          <div className="space-y-4">
            {recentReviews.map((review) => (
              <Card key={review.id} className="space-y-3 bg-slate-50/90">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{review.patientName}</h3>
                    <p className="text-sm text-slate-600">{review.comment || 'Aucun commentaire'}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={14} fill="currentColor" />
                    <span className="text-sm font-semibold text-slate-700">{review.rating}/5</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{review.verified ? 'Vérifié' : 'En attente de vérification'}</span>
                  <span>{new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(review.date))}</span>
                </div>
              </Card>
            ))}
            {recentReviews.length === 0 ? (
              <Card className="bg-slate-50/90 text-slate-600">
                Aucun avis récent n’est encore disponible.
              </Card>
            ) : null}
          </div>
        </MotionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <MotionCard className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Demande de modification profil (validation admin)</h2>
            <p className="text-sm text-slate-600">Les changements ne sont pas appliqués directement: ils sont envoyés à l administrateur pour validation.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={profileForm.nomComplet || profileInitialValues.nomComplet} onChange={(e) => handleProfileFormChange('nomComplet', e.target.value)} placeholder="Nom complet" />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={profileForm.specialite || profileInitialValues.specialite} onChange={(e) => handleProfileFormChange('specialite', e.target.value)} placeholder="Spécialité" />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={profileForm.tarifConsultation || profileInitialValues.tarifConsultation} onChange={(e) => handleProfileFormChange('tarifConsultation', e.target.value)} placeholder="Tarif (MAD)" />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={profileForm.experience || profileInitialValues.experience} onChange={(e) => handleProfileFormChange('experience', e.target.value)} placeholder="Expérience (années)" />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" value={profileForm.languesParlees || profileInitialValues.languesParlees} onChange={(e) => handleProfileFormChange('languesParlees', e.target.value)} placeholder="Langues (séparées par virgule)" />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" value={profileForm.diplomes || profileInitialValues.diplomes} onChange={(e) => handleProfileFormChange('diplomes', e.target.value)} placeholder="Diplômes (séparés par virgule)" />
            <textarea className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" rows={4} value={profileForm.bio || profileInitialValues.bio} onChange={(e) => handleProfileFormChange('bio', e.target.value)} placeholder="Bio..." />
            <textarea className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm md:col-span-2" rows={3} value={profileChangeReason} onChange={(e) => setProfileChangeReason(e.target.value)} placeholder="Cause de modification (obligatoire pour l admin)..." />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveDoctorProfile} disabled={profileSubmitting}>
              {profileSubmitting ? 'Envoi...' : 'Envoyer la demande admin'}
            </Button>
            <Button variant="outline" onClick={() => setProfileForm(profileInitialValues)}>
              Restaurer valeurs actuelles
            </Button>
          </div>
        </MotionCard>

        <MotionCard className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Localisation cabinet (validation admin)</h2>
            <p className="text-sm text-slate-600">Nouveau lieu ou changement de localisation: envoi obligatoire à l administrateur avec une cause.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={locationRequestForm.mode} onChange={(e) => setLocationRequestForm((c) => ({ ...c, mode: e.target.value }))}>
              <option value="LOCATION_CREATE">Nouveau lieu</option>
              <option value="LOCATION_UPDATE">Modifier un lieu existant</option>
            </select>
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={locationRequestForm.cabinetId} onChange={(e) => setLocationRequestForm((c) => ({ ...c, cabinetId: e.target.value }))}>
              <option value="">Sélectionner cabinet (si modification)</option>
              {cabinets.map((cabinet) => (
                <option key={cabinet.id} value={cabinet.id}>{cabinet.name}</option>
              ))}
            </select>
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={locationRequestForm.nom} onChange={(e) => setLocationRequestForm((c) => ({ ...c, nom: e.target.value }))} placeholder="Nom du cabinet" />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={locationRequestForm.adresse} onChange={(e) => setLocationRequestForm((c) => ({ ...c, adresse: e.target.value }))} placeholder="Adresse exacte" />
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={locationRequestForm.ville} onChange={(e) => setLocationRequestForm((c) => ({ ...c, ville: e.target.value }))}>
              <option value="">Sélectionner une ville (Maroc)</option>
              {MOROCCO_CITY_SELECT_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={locationRequestForm.quartier} onChange={(e) => setLocationRequestForm((c) => ({ ...c, quartier: e.target.value }))} placeholder="Quartier" />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={locationRequestForm.latitude} onChange={(e) => setLocationRequestForm((c) => ({ ...c, latitude: e.target.value }))} placeholder="Latitude" />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={locationRequestForm.longitude} onChange={(e) => setLocationRequestForm((c) => ({ ...c, longitude: e.target.value }))} placeholder="Longitude" />
            <div className="md:col-span-2">
              <LocationPickerMap
                latitude={locationRequestForm.latitude}
                longitude={locationRequestForm.longitude}
                onPick={(lat, lng) =>
                  setLocationRequestForm((current) => ({
                    ...current,
                    latitude: String(lat),
                    longitude: String(lng),
                  }))
                }
              />
            </div>
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" value={locationRequestForm.phone} onChange={(e) => setLocationRequestForm((c) => ({ ...c, phone: e.target.value }))} placeholder="Téléphone cabinet" />
            <textarea className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm md:col-span-2" rows={3} value={locationRequestForm.reason} onChange={(e) => setLocationRequestForm((c) => ({ ...c, reason: e.target.value }))} placeholder="Cause de la demande (obligatoire)..." />
          </div>
          <Button onClick={handleSubmitLocationRequest} disabled={profileSubmitting}>
            {profileSubmitting ? 'Envoi...' : 'Soumettre la demande localisation'}
          </Button>
        </MotionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <MotionCard className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Calendrier simplifié (créneaux)</h2>
            <p className="text-sm text-slate-600">1) Choisir cabinet et jour, 2) Choisir plage horaire, 3) Publier le créneau.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={availabilityForm.cabinetId || firstCabinetId} onChange={(e) => handleAvailabilityFormChange('cabinetId', e.target.value)}>
              {cabinets.map((cabinet) => (
                <option key={cabinet.id} value={cabinet.id}>{cabinet.name}</option>
              ))}
            </select>
            <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={availabilityForm.jourSemaine} onChange={(e) => handleAvailabilityFormChange('jourSemaine', e.target.value)}>
              {['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'].map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
            <input type="time" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={availabilityForm.heureDebut} onChange={(e) => handleAvailabilityFormChange('heureDebut', e.target.value)} />
            <input type="time" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={availabilityForm.heureFin} onChange={(e) => handleAvailabilityFormChange('heureFin', e.target.value)} />
            <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={availabilityForm.dureeConsultation} onChange={(e) => handleAvailabilityFormChange('dureeConsultation', e.target.value)} placeholder="Durée (min)" />
          </div>
          <Button onClick={handleCreateAvailability} disabled={availabilitySubmitting || !cabinets.length}>
            {availabilitySubmitting ? 'Ajout...' : 'Publier créneau'}
          </Button>
        </MotionCard>

        <MotionCard className="space-y-5">
          <h2 className="text-xl font-bold text-slate-900">Demandes envoyées à l admin</h2>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {(doctorChangeRequestsQuery.data || []).map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-900">{request.type}</p>
                <p className="text-slate-600">{request.reason}</p>
                <p className="text-xs text-slate-500">Statut: {request.status}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEditSentRequest(request)} disabled={request.status !== 'PENDING'}>
                    Modifier
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleCancelSentRequest(request)} disabled={request.status !== 'PENDING'}>
                    Annuler l envoi
                  </Button>
                </div>
              </div>
            ))}
            {!(doctorChangeRequestsQuery.data || []).length ? (
              <Card className="bg-slate-50/90 text-slate-600">Aucune demande envoyée.</Card>
            ) : null}
          </div>
        </MotionCard>
      </section>

      <MotionCard className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Repertoire patients</h2>
            <p className="text-sm text-slate-600">Recherche, tri et acces rapide aux profils patients deja consultes.</p>
          </div>
          <Badge variant="info">{filteredPatients.length} patients</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr,220px]">
          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <Search size={16} className="text-med-primary" />
            <input
              value={patientSearch}
              onChange={(event) => setPatientSearch(event.target.value)}
              placeholder="Rechercher patient..."
              className="w-full bg-transparent outline-none"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <ArrowUpDown size={16} className="text-med-primary" />
            <select
              value={patientSort}
              onChange={(event) => setPatientSort(event.target.value)}
              className="w-full bg-transparent outline-none"
            >
              <option value="recent">Derniere visite</option>
              <option value="visits">Nb consultations</option>
              <option value="name">Nom</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="space-y-3 bg-slate-50/90">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{patient.name}</h3>
                  <p className="text-sm text-slate-600">{patient.email || 'Email non renseigne'}</p>
                </div>
                {patient.warnings > 0 ? (
                  <Badge variant="warning">{patient.warnings} avertissement(s)</Badge>
                ) : (
                  <Badge variant="success">Profil stable</Badge>
                )}
              </div>
              <p className="text-sm text-slate-600">{patient.antecedents}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{patient.appointmentsCount} consultations</span>
                <span>-</span>
                <span>{patient.phone || 'Tel non renseigne'}</span>
              </div>
            </Card>
          ))}
          {filteredPatients.length === 0 ? (
            <Card className="bg-slate-50/90 text-slate-600">Aucun patient ne correspond aux filtres.</Card>
          ) : null}
        </div>
      </MotionCard>

      <MotionCard className="space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-med-secondary" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Profil public enregistré</h2>
            <p className="text-sm text-slate-600">Aperçu du profil tel qu’il est stocké côté backend.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="space-y-1 bg-slate-50/90">
            <p className="text-xs uppercase tracking-wide text-slate-500">Nom</p>
            <p className="font-semibold text-slate-900">{publicProfile.nomComplet || doctor.name || 'Non renseigné'}</p>
          </Card>
          <Card className="space-y-1 bg-slate-50/90">
            <p className="text-xs uppercase tracking-wide text-slate-500">Spécialité</p>
            <p className="font-semibold text-slate-900">
              {formatSpecialtyLabel(publicProfile.specialite || doctor.specialty || 'Non renseignée')}
            </p>
          </Card>
          <Card className="space-y-1 bg-slate-50/90">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tarif</p>
            <p className="font-semibold text-slate-900">
              {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(publicProfile.tarifConsultation || 0)}
            </p>
          </Card>
          <Card className="space-y-1 bg-slate-50/90">
            <p className="text-xs uppercase tracking-wide text-slate-500">Vérifier</p>
            <p className="font-semibold text-slate-900">{doctor.isVerified ? 'Compte vérifié' : 'En attente'}</p>
          </Card>
        </div>
      </MotionCard>
    </MotionDiv>
  );
}

export default DashboardDoctorPage;
