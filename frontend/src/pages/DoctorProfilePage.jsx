import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import {
  CalendarClock,
  CalendarPlus,
  CalendarDays,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Languages,
  MapPin,
  Navigation,
  NotebookTabs,
  Star,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import AccessPromptModal from '../components/common/AccessPromptModal';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import { fetchCsrfToken } from '../lib/accountActions';
import { getCurrentSession } from '../lib/auth';
import { formatAppointmentDate } from '../lib/date';
import { formatSpecialtyLabel } from '../lib/frenchText';

const MotionDiv = motion.div;
const defaultCenter = [31.7917, -7.0926];

const tabs = [
  { id: 'about', label: 'À propos' },
  { id: 'availabilities', label: 'Disponibilités' },
  { id: 'reviews', label: 'Avis' },
  { id: 'location', label: 'Localisation' },
];

const bookingReasonSuggestions = [
  'Contrôle annuel',
  'Douleur thoracique',
  'Suivi chronique',
  'Résultat d’analyse',
  'Renouvellement d’ordonnance',
  'Consultation de suivi',
];

const paymentOptions = [
  {
    value: 'CMI',
    label: 'Carte bancaire',
    description: 'Paiement en ligne avant confirmation du rendez-vous.',
  },
  {
    value: 'CASH',
    label: 'Espèces',
    description: 'Paiement sur place avant le rendez-vous, avec acceptation des conditions.',
  },
];

const defaultBookingForm = {
  motif: '',
  notes: '',
  methodePaiement: 'CMI',
  acceptedGeneralTerms: false,
  acceptedCashPolicy: false,
  cardHolder: '',
  cardNumber: '',
  expMonth: '',
  expYear: '',
  cvc: '',
};

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const weekdayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const weekdayEnumByIndex = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];

const toLocalISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseLocalISODate = (value) => {
  if (!value) {
    return new Date();
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
};

const getCalendarGridStart = (monthDate) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);

  gridStart.setDate(firstDay.getDate() - offset);

  return gridStart;
};

function DoctorProfilePage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => (searchParams.get('tab') === 'availabilities' ? 'availabilities' : 'about'));
  const [selectedDate, setSelectedDate] = useState(() => toLocalISODate(new Date()));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [accessPromptOpen, setAccessPromptOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState(defaultBookingForm);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const session = getCurrentSession();

  const doctorQuery = useQuery({
    queryKey: ['doctor-profile', id],
    queryFn: async () => {
      const response = await api.get(`/doctors/${id}`);
      return response.data?.data;
    },
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const availabilitiesQuery = useQuery({
    queryKey: ['doctor-availabilities', id, selectedDate],
    enabled: Boolean(id),
    staleTime: 30 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await api.get(`/doctors/${id}/availabilities`, {
        params: { date: selectedDate },
      });

      return response.data?.data?.availabilities || [];
    },
  });

  const reviewsQuery = useQuery({
    queryKey: ['doctor-reviews', id],
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await api.get(`/doctors/${id}/reviews`, {
        params: { page: 1, limit: 8 },
      });

      return response.data?.data || { reviews: [], total: 0, averageNote: 0 };
    },
  });

  const slots = useMemo(() => {
    return (availabilitiesQuery.data || []).flatMap((availability) =>
      (availability.slots || []).map((slot) => ({
        ...slot,
        cabinet: availability.cabinet,
        disponibiliteId: availability.disponibiliteId,
      }))
    );
  }, [availabilitiesQuery.data]);

  const doctor = doctorQuery.data || {};
  const ratingAverage = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number(doctor.rating?.average || 0));
  const ratingCount = doctor.rating?.count || 0;
  const activeAvailabilityDays = useMemo(
    () => new Set((doctor.availabilityDays || []).filter(Boolean)),
    [doctor.availabilityDays]
  );
  const calendarMonthDate = useMemo(() => parseLocalISODate(selectedDate), [selectedDate]);
  const calendarMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('fr-MA', {
        month: 'long',
        year: 'numeric',
      }).format(calendarMonthDate),
    [calendarMonthDate]
  );
  const selectedDateWeekday = weekdayEnumByIndex[parseLocalISODate(selectedDate).getDay()];
  const selectedDateIsAvailable = activeAvailabilityDays.has(selectedDateWeekday);
  const calendarDays = useMemo(() => {
    const gridStart = getCalendarGridStart(calendarMonthDate);
    const todayISO = toLocalISODate(new Date());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);

      const isoDate = toLocalISODate(date);
      const weekdayIndex = date.getDay();
      const isCurrentMonth = date.getMonth() === calendarMonthDate.getMonth();
      const isAvailable = activeAvailabilityDays.has(weekdayEnumByIndex[weekdayIndex]);

      return {
        date,
        isoDate,
        dayNumber: date.getDate(),
        weekdayLabel: weekdayLabels[(weekdayIndex + 6) % 7],
        isCurrentMonth,
        isAvailable,
        isSelected: isoDate === selectedDate,
        isToday: isoDate === todayISO,
      };
    });
  }, [activeAvailabilityDays, calendarMonthDate, selectedDate]);

  if (doctorQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-20" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (doctorQuery.isError || !doctorQuery.data) {
    return (
      <Card className="border-red-200 bg-red-50/70">
        <h1 className="text-xl font-semibold text-red-800">Profil indisponible</h1>
        <p className="mt-2 text-sm text-red-700">
          Ce médecin est introuvable ou le backend est inaccessible.
        </p>
      </Card>
    );
  }
  const firstCabinet = doctor.doctorCabinets?.[0]?.cabinet || null;
  const mappableCabinets = (doctor.doctorCabinets || [])
    .map((entry) => entry.cabinet)
    .filter((cabinet) => toSafeNumber(cabinet?.latitude) !== null && toSafeNumber(cabinet?.longitude) !== null)
    .map((cabinet) => ({
      ...cabinet,
      latitude: toSafeNumber(cabinet.latitude),
      longitude: toSafeNumber(cabinet.longitude),
    }));
  const canShowMap = mappableCabinets.length > 0;
  const center = canShowMap ? [mappableCabinets[0].latitude, mappableCabinets[0].longitude] : defaultCenter;

  const selectedSlotDateLabel = selectedSlot?.start
    ? formatAppointmentDate(selectedSlot.start, i18n.language)
    : null;

  const bookingRedirectPath = `/doctor/${id}?tab=availabilities`;

  const resetBookingForm = () => {
    setBookingForm(defaultBookingForm);
  };

  const handleOpenBooking = () => {
    if (!selectedSlot) {
      toast.error('Sélectionnez un créneau avant de continuer.');
      setActiveTab('availabilities');
      return;
    }

    if (!session.isAuthenticated || session.role !== 'PATIENT') {
      setAccessPromptOpen(true);
      return;
    }

    setModalOpen(true);
  };

  const handleConfirmAppointment = async () => {
    if (!selectedSlot) {
      toast.error('Sélectionnez un créneau avant de confirmer.');
      return;
    }

    if (!bookingForm.motif.trim()) {
      toast.error('Précisez le motif du rendez-vous.');
      return;
    }

    if (!bookingForm.acceptedGeneralTerms) {
      toast.error('Vous devez accepter les conditions générales de réservation.');
      return;
    }

    if (bookingForm.methodePaiement === 'CASH' && !bookingForm.acceptedCashPolicy) {
      toast.error('Vous devez accepter la politique de paiement en espèces.');
      return;
    }
    if (bookingForm.methodePaiement === 'CMI') {
      const cardNumber = bookingForm.cardNumber.replace(/\s/g, '');
      if (!bookingForm.cardHolder.trim() || cardNumber.length !== 16 || !/^\d{16}$/.test(cardNumber)) {
        toast.error('Veuillez renseigner une carte valide (16 chiffres).');
        return;
      }
      if (!/^(0[1-9]|1[0-2])$/.test(bookingForm.expMonth) || !/^\d{2}$/.test(bookingForm.expYear)) {
        toast.error('Date d’expiration de la carte invalide.');
        return;
      }
      if (!/^\d{3,4}$/.test(bookingForm.cvc)) {
        toast.error('Code CVC invalide.');
        return;
      }
    }

    try {
      setBookingSubmitting(true);
      await fetchCsrfToken();

      const response = await api.post('/appointments', {
        doctorId: id,
        disponibiliteId: selectedSlot.disponibiliteId,
        cabinetId: selectedSlot.cabinet?.id || undefined,
        motif: bookingForm.motif.trim(),
        notes: bookingForm.notes.trim() || undefined,
        dateHeure: selectedSlot.start,
        typeConsultation: 'PRESENTIEL',
        methodePaiement: bookingForm.methodePaiement,
        acceptedGeneralTerms: bookingForm.acceptedGeneralTerms,
        acceptedCashPolicy: bookingForm.methodePaiement === 'CASH' ? bookingForm.acceptedCashPolicy : false,
        cardPayment:
          bookingForm.methodePaiement === 'CMI'
            ? {
                cardHolder: bookingForm.cardHolder.trim(),
                cardNumber: bookingForm.cardNumber.replace(/\s/g, ''),
                expMonth: bookingForm.expMonth,
                expYear: bookingForm.expYear,
                cvc: bookingForm.cvc,
              }
            : undefined,
      });

      const createdAppointment = response.data?.data;
      toast.success('Rendez-vous créé.');
      setModalOpen(false);
      resetBookingForm();

      if (createdAppointment?.paymentCheckoutUrl) {
        window.location.assign(createdAppointment.paymentCheckoutUrl);
        return;
      }
      if (createdAppointment?.id) {
        navigate(`/appointment/${createdAppointment.id}`);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible de créer ce rendez-vous pour le moment.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <MotionDiv
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="relative overflow-hidden space-y-5 rounded-[28px] border-med-primary/10 bg-white/95 p-6 shadow-xl shadow-med-primary/10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-med-primary via-med-secondary to-med-accent" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-med-primary/10 blur-3xl" />
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              size="lg"
              name={doctor.nomComplet || doctor.user?.email || 'Doctor'}
              alt={doctor.nomComplet || doctor.user?.email}
            />
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{doctor.nomComplet || doctor.user?.email}</h1>
              <p className="text-slate-600">{formatSpecialtyLabel(doctor.specialite)}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-med-primary/10 bg-med-primary/5 px-4 py-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-med-primary/10 p-2 text-med-primary">
                  <Clock3 size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Expérience</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {doctor.experience != null ? `${doctor.experience} ans d’expérience` : 'Expérience non renseignée'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-med-secondary/10 bg-med-secondary/10 px-4 py-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-med-secondary/15 p-2 text-emerald-700">
                  <CheckCircle2 size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assurance</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {doctor.accepteAssurance ? 'Assurance acceptée' : 'Sans assurance'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-med-accent/15 bg-med-accent/10 px-4 py-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-med-accent/20 p-2 text-amber-800">
                  <Star size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Avis</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {ratingAverage} / 5 • {ratingCount} avis
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
              <Languages size={16} className="text-med-primary" /> {(doctor.languesParlees || []).join(', ') || 'FR'}
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
              <MapPin size={16} className="text-med-secondary" />
              {(doctor.doctorCabinets || [])
                .map((entry) => entry.cabinet?.ville)
                .filter(Boolean)
                .join(', ') || 'Maroc'}
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
              <CalendarClock size={16} className="text-med-accent" /> {selectedSlotDateLabel || 'Choisissez un créneau'}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                handleOpenBooking();
              }}
              className="gap-2"
            >
              <CalendarPlus size={16} /> Prendre RDV
            </Button>
            <Button
              variant="outline"
              className="shadow-sm"
              onClick={() => setActiveTab('availabilities')}
            >
              Voir disponibilités
            </Button>
          </div>
        </Card>
      </MotionDiv>

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-med-primary text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'about' ? (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-slate-700">
              {doctor.bio || 'Ce médecin a un profil en cours d’enrichissement.'}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="space-y-2 bg-slate-50">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <NotebookTabs size={16} className="text-med-primary" /> Diplômes
                </h3>
                {(doctor.diplomes || []).length ? (
                  <ul className="space-y-1 text-sm text-slate-600">
                    {(doctor.diplomes || []).map((diplome) => (
                      <li key={diplome}>- {diplome}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">Aucun diplôme renseigné.</p>
                )}
              </Card>

              <Card className="space-y-2 bg-slate-50">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CheckCircle2 size={16} className="text-med-secondary" /> Assurance
                </h3>
                <p className="text-sm text-slate-600">
                  {doctor.accepteAssurance
                    ? `Assurances: ${(doctor.assurancesAcceptees || []).join(', ') || 'Selon profil'}`
                    : 'Ce médecin ne prend pas encore les assurances déclarées.'}
                </p>
              </Card>
            </div>
          </MotionDiv>
        ) : null}

        {activeTab === 'availabilities' ? (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Card className="space-y-4 border-med-primary/10 bg-gradient-to-br from-white via-white to-slate-50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <CalendarDays size={18} className="text-med-primary" /> Aperçu du calendrier
                  </h3>
                  <p className="max-w-2xl text-sm text-slate-600">
                    Les jours en vert correspondent aux jours où ce médecin publie au moins un créneau.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="inline-flex items-center gap-2 rounded-full bg-med-secondary/15 px-3 py-1.5 text-emerald-800">
                    <span className="h-2.5 w-2.5 rounded-full bg-med-secondary" /> Disponible
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Non actif
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-med-primary/10 px-3 py-1.5 text-med-primary">
                    <span className="h-2.5 w-2.5 rounded-full bg-med-primary" /> Sélectionné
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold capitalize text-slate-900">{calendarMonthLabel}</p>
                <p className="text-xs text-slate-500">
                  {activeAvailabilityDays.size
                    ? `${activeAvailabilityDays.size} jour(s) actifs par semaine`
                    : 'Planning récurrent non publié'}
                </p>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {weekdayLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => (
                  <button
                    key={day.isoDate}
                    type="button"
                    disabled={!day.isAvailable}
                    title={day.isAvailable ? 'Jour actif' : 'Jour sans disponibilité'}
                    onClick={() => {
                      if (!day.isAvailable) {
                        return;
                      }

                      setSelectedDate(day.isoDate);
                      setSelectedSlot(null);
                    }}
                    className={`flex min-h-[74px] flex-col justify-between rounded-2xl border p-2 text-left transition ${
                      day.isSelected
                        ? 'border-med-primary bg-med-primary text-white shadow-lg shadow-med-primary/20'
                        : day.isAvailable
                          ? day.isCurrentMonth
                            ? 'border-med-secondary/30 bg-med-secondary/10 text-slate-900 hover:border-med-secondary/50 hover:bg-med-secondary/15'
                            : 'border-med-secondary/20 bg-med-secondary/5 text-slate-700 hover:border-med-secondary/40'
                          : day.isCurrentMonth
                            ? 'border-slate-200 bg-slate-100 text-slate-400'
                            : 'border-slate-200/70 bg-slate-50 text-slate-300'
                    } ${!day.isAvailable ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold uppercase ${day.isSelected ? 'text-white/80' : day.isAvailable ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {day.weekdayLabel}
                      </span>
                      {day.isToday ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${day.isSelected ? 'bg-white/20 text-white' : 'bg-white text-med-primary'}`}>
                          Aujourd’hui
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-end justify-between gap-2">
                      <span className="text-base font-bold">{day.dayNumber}</span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          day.isSelected
                            ? 'bg-white'
                            : day.isAvailable
                              ? 'bg-med-secondary'
                              : 'bg-slate-300'
                        }`}
                      />
                    </div>
                  </button>
                ))}
              </div>

              {!activeAvailabilityDays.size ? (
                <p className="inline-flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  Aucun jour actif n’a encore été publié pour ce médecin.
                </p>
              ) : null}

              {selectedDate && !selectedDateIsAvailable ? (
                <p className="inline-flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  Le jour sélectionné est habituellement inactif. Choisissez un jour en vert pour voir des créneaux.
                </p>
              ) : null}
            </Card>

            <div className="max-w-sm space-y-1.5">
              <label htmlFor="selected-date" className="text-sm font-medium text-slate-700">
                Date
              </label>
              <input
                id="selected-date"
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800"
              />
            </div>

            {availabilitiesQuery.isLoading ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : null}

            {!availabilitiesQuery.isLoading && slots.length === 0 ? (
              <Card className="bg-slate-50">
                <p className="text-sm text-slate-600">Aucun créneau disponible pour cette date.</p>
              </Card>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-xl border px-3 py-2 text-start text-sm transition ${
                    selectedSlot?.start === slot.start
                      ? 'border-med-primary bg-med-primary/10 text-med-primary'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-med-primary/50'
                  }`}
                >
                  <p className="font-semibold">
                    {new Date(slot.start).toLocaleTimeString('fr-MA', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </p>
                  <p className="text-xs text-slate-500">{slot.cabinet?.nom || 'Cabinet'}</p>
                </button>
              ))}
            </div>
          </MotionDiv>
        ) : null}

        {activeTab === 'reviews' ? (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {reviewsQuery.isLoading ? (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </>
            ) : null}

            {!reviewsQuery.isLoading && (reviewsQuery.data?.reviews || []).length === 0 ? (
              <Card className="bg-slate-50">
                <p className="text-sm text-slate-600">Aucun avis disponible pour ce médecin.</p>
              </Card>
            ) : null}

            {(reviewsQuery.data?.reviews || []).map((review) => (
              <Card key={review.id} className="space-y-2 bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {review.patient?.user?.email || 'Patient'}
                  </p>
                  <p className="inline-flex items-center gap-1 text-sm text-amber-600">
                    <Star size={14} /> {review.note}/5
                  </p>
                </div>
                <p className="text-sm text-slate-600">{review.commentaire || 'Aucun commentaire.'}</p>
              </Card>
            ))}
          </MotionDiv>
        ) : null}

        {activeTab === 'location' ? (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {canShowMap ? (
              <>
                <div className="h-[320px] overflow-hidden rounded-xl border border-slate-200">
                  <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="h-full w-full">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {mappableCabinets.map((cabinet) => (
                      <CircleMarker
                        key={cabinet.id}
                        center={[cabinet.latitude, cabinet.longitude]}
                        radius={10}
                        pathOptions={{ color: '#1A6B8A', fillColor: '#2ECC8F', fillOpacity: 0.8 }}
                      >
                        <Popup>
                          <strong>{cabinet.nom}</strong>
                          <br />
                          {cabinet.adresse}
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>

                <div className="grid gap-2">
                  {mappableCabinets.map((cabinet) => {
                    const itineraryUrl = `https://www.google.com/maps/dir/?api=1&destination=${cabinet.latitude},${cabinet.longitude}`;
                    return (
                      <div key={`cabinet-location-${cabinet.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                        <p className="text-slate-700">
                          {cabinet.nom} - {cabinet.adresse}, {cabinet.ville}
                        </p>
                        <a href={itineraryUrl} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm" className="gap-1">
                            <Navigation size={14} /> Itinéraire
                          </Button>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <Card className="bg-slate-50">
                <p className="text-sm text-slate-600">Aucune localisation de cabinet disponible.</p>
              </Card>
            )}
          </MotionDiv>
        ) : null}
      </Card>

      <AccessPromptModal
        isOpen={accessPromptOpen}
        onClose={() => setAccessPromptOpen(false)}
        redirectTo={bookingRedirectPath}
        doctorName={doctor.nomComplet || doctor.user?.email || 'ce médecin'}
        title="Continuez votre réservation"
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirmation du rendez-vous">
        <div className="space-y-5">
          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2">
            <p className="min-w-0 break-words">
              Médecin : <strong className="break-all">{doctor.nomComplet || doctor.user?.email}</strong>
            </p>
            <p className="min-w-0 break-words">
              Créneau : <strong className="break-words">{selectedSlotDateLabel || 'Aucun créneau sélectionné'}</strong>
            </p>
            <p className="min-w-0 break-words">
              Cabinet: <strong className="break-words">{selectedSlot?.cabinet?.nom || firstCabinet?.nom || 'N/A'}</strong>
            </p>
            <p className="min-w-0 break-words">
              Mode de consultation : <strong>Présentiel</strong>
            </p>
          </div>

          <Input
            id="booking-motif"
            label="Motif du rendez-vous"
            placeholder="Suivi chronique, douleur, contrôle..."
            suggestions={bookingReasonSuggestions}
            helperText="Le motif est obligatoire pour confirmer le rendez-vous."
            value={bookingForm.motif}
            onChange={(event) => setBookingForm((current) => ({ ...current, motif: event.target.value }))}
          />

          <div className="space-y-1.5">
            <label htmlFor="booking-notes" className="text-sm font-medium text-slate-700">
              Notes complémentaires
            </label>
            <textarea
              id="booking-notes"
              rows={3}
              placeholder="Allergies, traitement en cours, précisions utiles..."
              className="w-full rounded-[10px] border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm focus:border-[#1A6B8A] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
              value={bookingForm.notes}
              onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Choisissez votre moyen de paiement</p>
              <p className="text-xs text-slate-500">Carte bancaire réelle via passerelle sécurisée (chiffrée).</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {paymentOptions.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    bookingForm.methodePaiement === option.value
                      ? 'border-med-primary bg-med-primary/10'
                      : 'border-slate-200 bg-slate-50 hover:border-med-primary/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="booking-payment-method"
                      value={option.value}
                      checked={bookingForm.methodePaiement === option.value}
                      onChange={() =>
                        setBookingForm((current) => ({
                          ...current,
                          methodePaiement: option.value,
                          acceptedCashPolicy: option.value === 'CASH' ? current.acceptedCashPolicy : false,
                        }))
                      }
                      className="mt-1 accent-med-primary"
                    />
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">{option.label}</p>
                      <p className="text-sm text-slate-600">{option.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {bookingForm.methodePaiement === 'CMI' ? (
              <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 md:grid-cols-2">
                <Input
                  id="card-holder"
                  label="Titulaire de la carte"
                  placeholder="AMINE FASSI"
                  value={bookingForm.cardHolder}
                  onChange={(event) => setBookingForm((current) => ({ ...current, cardHolder: event.target.value.toUpperCase() }))}
                />
                <Input
                  id="card-number"
                  label="Numéro de carte"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  value={bookingForm.cardNumber}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/\D/g, '').slice(0, 16);
                    const grouped = raw.replace(/(.{4})/g, '$1 ').trim();
                    setBookingForm((current) => ({ ...current, cardNumber: grouped }));
                  }}
                />
                <Input
                  id="card-exp-month"
                  label="Mois (MM)"
                  placeholder="08"
                  maxLength={2}
                  value={bookingForm.expMonth}
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      expMonth: event.target.value.replace(/\D/g, '').slice(0, 2),
                    }))
                  }
                />
                <Input
                  id="card-exp-year"
                  label="Année (YY)"
                  placeholder="27"
                  maxLength={2}
                  value={bookingForm.expYear}
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      expYear: event.target.value.replace(/\D/g, '').slice(0, 2),
                    }))
                  }
                />
                <Input
                  id="card-cvc"
                  label="CVC"
                  placeholder="123"
                  maxLength={4}
                  value={bookingForm.cvc}
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      cvc: event.target.value.replace(/\D/g, '').slice(0, 4),
                    }))
                  }
                />
                <div className="rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-600">
                  Les données carte sont transmises vers la passerelle bancaire sécurisée.
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="space-y-2 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Conditions obligatoires</p>
              <ul className="space-y-2">
                <li>Vous devez être connecté avec un compte patient pour confirmer ce rendez-vous.</li>
                <li>Si vous ne pouvez pas venir, vous devez annuler à l’avance en indiquant une cause précise.</li>
                <li>Un rendez-vous manqué sans annulation peut déclencher un avertissement visible par les prochains médecins.</li>
                <li>Vos informations de contact doivent rester exactes pour recevoir les rappels.</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              <input
                type="checkbox"
                className="mt-1 accent-med-primary"
                checked={bookingForm.acceptedGeneralTerms}
                onChange={(event) =>
                  setBookingForm((current) => ({
                    ...current,
                    acceptedGeneralTerms: event.target.checked,
                  }))
                }
              />
              <span>J’accepte les conditions générales de réservation et la politique d’annulation avant le rendez-vous.</span>
            </label>

            {bookingForm.methodePaiement === 'CASH' ? (
              <label className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <input
                  type="checkbox"
                  className="mt-1 accent-red-600"
                  checked={bookingForm.acceptedCashPolicy}
                  onChange={(event) =>
                    setBookingForm((current) => ({
                      ...current,
                      acceptedCashPolicy: event.target.checked,
                    }))
                  }
                />
                <span>
                  Pour un paiement en espèces, j’accepte que toute absence sans annulation préalable avec motif précis puisse entraîner un avertissement et une sanction sur mon compte.
                </span>
              </label>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirmAppointment} disabled={bookingSubmitting}>
            {bookingSubmitting ? 'Confirmation...' : 'Confirmer'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default DoctorProfilePage;
