import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  ArrowUpDown,
  Bell,
  CalendarDays,
  Clock3,
  FileClock,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
  UsersRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import MotionCard from '../components/ui/MotionCard';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import { formatAppointmentDate } from '../lib/date';
import { formatSpecialtyLabel } from '../lib/frenchText';

const MotionDiv = motion.div;

const shortDateTimeFormatter = new Intl.DateTimeFormat('fr-MA', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const currencyFormatter = new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',
  maximumFractionDigits: 0,
});

const statusTone = {
  CONFIRME: 'success',
  COMPLETE: 'info',
  ANNULE: 'neutral',
  EN_ATTENTE: 'warning',
  NO_SHOW: 'warning',
};

const notificationTone = {
  RDV_CONFIRME: 'success',
  RAPPEL_RDV: 'warning',
  SYSTEME: 'info',
  RDV_ANNULE: 'neutral',
  PAIEMENT_RECU: 'info',
};

const defaultDashboard = {
  patient: {},
  summary: {
    upcomingAppointments: 0,
    historyCount: 0,
    favoriteDoctors: 0,
    unreadNotifications: 0,
  },
  upcomingAppointment: null,
  historyAppointments: [],
  favoriteDoctors: [],
  notifications: [],
  medicalProfile: {},
  reviewPrompt: null,
};

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={`star-${index + 1}`}
      size={16}
      fill={index < rating ? 'currentColor' : 'none'}
      className={index < rating ? 'text-amber-500' : 'text-slate-300'}
    />
  ));
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`summary-skeleton-${index + 1}`} className="h-28" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-96" />
          <Skeleton className="h-80" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-80" />
        </div>
      </div>
    </div>
  );
}

function DashboardPatientPage() {
  const navigate = useNavigate();
  const [historySearch, setHistorySearch] = useState('');
  const [historySort, setHistorySort] = useState('recent');

  const dashboardQuery = useQuery({
    queryKey: ['patient-dashboard'],
    staleTime: 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await api.get('/dashboard/patient');
      return response.data?.data || defaultDashboard;
    },
  });

  if (dashboardQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    const requiresLogin = dashboardQuery.error?.response?.status === 401 || dashboardQuery.error?.response?.status === 403;

    return (
      <Card className="space-y-4 border-red-200 bg-red-50/70">
        <div className="space-y-2">
          <Badge variant="warning">{requiresLogin ? 'Connexion requise' : 'Dossier indisponible'}</Badge>
          <h1 className="text-2xl font-bold text-red-900">
            {requiresLogin ? 'Connectez-vous pour voir vos données' : 'Impossible de charger le tableau de bord patient'}
          </h1>
          <p className="text-sm text-red-800">
            {requiresLogin
              ? 'Votre session est requise pour afficher les rendez-vous, notifications et dossiers réels.'
              : 'La source de données de ce tableau de bord n’est pas disponible pour le moment.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {requiresLogin ? (
            <Button onClick={() => navigate('/connexion')}>Aller à la connexion</Button>
          ) : null}
          <Button onClick={() => dashboardQuery.refetch()} variant="outline">
            Reessayer
          </Button>
        </div>
      </Card>
    );
  }

  const dashboard = dashboardQuery.data || defaultDashboard;
  const profile = dashboard.patient || {};
  const upcomingAppointment = dashboard.upcomingAppointment || null;
  const historyAppointments = dashboard.historyAppointments || [];
  const favoriteDoctors = dashboard.favoriteDoctors || [];
  const notifications = dashboard.notifications || [];
  const medicalProfile = dashboard.medicalProfile || {};
  const reviewPrompt = dashboard.reviewPrompt || null;

  const filteredHistory = [...historyAppointments]
    .filter((appointment) => {
      const q = historySearch.trim().toLowerCase();
      if (!q) {
        return true;
      }
      return (
        String(appointment.doctorName || '').toLowerCase().includes(q)
        || String(appointment.specialty || '').toLowerCase().includes(q)
        || String(appointment.city || '').toLowerCase().includes(q)
      );
    })
    .sort((left, right) => {
      if (historySort === 'doctor') {
        return String(left.doctorName || '').localeCompare(String(right.doctorName || ''));
      }
      if (historySort === 'status') {
        return String(left.status || '').localeCompare(String(right.status || ''));
      }
      return new Date(right.dateTime).getTime() - new Date(left.dateTime).getTime();
    });

  const summaryCards = [
    {
      label: 'Prochain RDV',
      value: upcomingAppointment
        ? shortDateTimeFormatter.format(new Date(upcomingAppointment.dateTime))
        : 'Aucun',
      detail: upcomingAppointment
        ? upcomingAppointment.doctorName
        : 'Aucun rendez-vous à venir',
      icon: CalendarDays,
    },
    {
      label: 'Historique',
      value: `${dashboard.summary?.historyCount || 0}`,
      detail: 'consultations archivées',
      icon: FileClock,
    },
    {
      label: 'Médecins récurrents',
      value: `${dashboard.summary?.favoriteDoctors || 0}`,
      detail: 'spécialistes suivis dans la base',
      icon: ShieldCheck,
    },
    {
      label: 'Notifications',
      value: `${dashboard.summary?.unreadNotifications || 0}`,
      detail: 'messages non lus',
      icon: Bell,
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
        <Badge variant="info">Données issues de la base</Badge>
        <div
          className="h-36 w-full rounded-3xl bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.46), rgba(15,23,42,0.46)), url('https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1600&q=80')",
          }}
        />
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Dashboard Patient
            </h1>
            <p className="max-w-3xl text-slate-600">
              Rendez-vous, médecins récurrents, dossier médical et notifications chargés depuis la base.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
            <p className="font-semibold text-slate-900">{profile.displayName || 'Compte patient'}</p>
            <p>{profile.email || 'Email non renseigné'}</p>
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
              <p className="text-sm text-slate-600">{card.detail}</p>
            </MotionCard>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-6">
          <MotionCard className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Prochain rendez-vous</h2>
                <p className="text-sm text-slate-600">
                  Le prochain créneau visible dans la base vous permet d’ouvrir le détail rapidement.
                </p>
              </div>
              {upcomingAppointment ? (
                <Badge variant={statusTone[upcomingAppointment.status] || 'info'}>
                  {upcomingAppointment.type === 'TELECONSULTATION' ? 'Teleconsultation' : 'Présentiel'}
                </Badge>
              ) : (
                <Badge variant="neutral">Aucun créneau</Badge>
              )}
            </div>

            {upcomingAppointment ? (
              <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
                <div className="space-y-4 rounded-3xl border border-med-primary/20 bg-gradient-to-br from-cyan-50 to-white p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name={upcomingAppointment.doctorName} size="md" />
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{upcomingAppointment.doctorName}</h3>
                      <p className="text-sm text-slate-600">{formatSpecialtyLabel(upcomingAppointment.specialty)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 pt-2 text-sm text-slate-700 md:grid-cols-2">
                    <p className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2">
                      <CalendarDays size={16} className="text-med-primary" />
                      {formatAppointmentDate(upcomingAppointment.dateTime, 'fr')}
                    </p>
                    <p className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2">
                      <MapPin size={16} className="text-med-primary" />
                      {upcomingAppointment.cabinetLabel || upcomingAppointment.cabinet || 'Cabinet non renseigné'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{upcomingAppointment.reason}</Badge>
                    <Badge variant="warning">{currencyFormatter.format(upcomingAppointment.price || 0)}</Badge>
                    <Badge variant="neutral">RDV {upcomingAppointment.id}</Badge>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-700">
                    {upcomingAppointment.note || 'Aucune note additionnelle.'}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button className="gap-2" onClick={() => navigate(`/appointment/${upcomingAppointment.id}`)}>
                      <Clock3 size={16} /> Ouvrir le détail
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() =>
                        navigate(
                          `/search?q=${encodeURIComponent(upcomingAppointment.specialty)}&ville=${encodeURIComponent(
                            upcomingAppointment.city || ''
                          )}`
                        )
                      }
                    >
                      <UsersRound size={16} /> Trouver un médecin similaire
                    </Button>
                  </div>
                </div>

                <Card className="space-y-4 bg-slate-50/90">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">À préparer</p>
                    <Badge variant={statusTone[upcomingAppointment.status] || 'info'}>
                      {upcomingAppointment.status}
                    </Badge>
                  </div>

                  <div className="space-y-3 text-sm text-slate-700">
                    <p className="inline-flex items-center gap-2">
                      <ShieldCheck size={16} className="text-med-secondary" />
                      Type de consultation: {upcomingAppointment.type}
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <FileClock size={16} className="text-med-primary" />
                      Duree estimee: {upcomingAppointment.durationMinutes || 30} min
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <MessageSquare size={16} className="text-med-primary" />
                      Note: {upcomingAppointment.note || 'Aucune note'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate(`/appointment/${upcomingAppointment.id}`)}
                  >
                    <Clock3 size={16} /> Voir le détail du rendez-vous
                  </Button>
                </Card>
              </div>
            ) : (
              <Card className="space-y-4 bg-slate-50/90 text-center">
                <p className="text-lg font-semibold text-slate-900">Aucun rendez-vous programmé</p>
                <p className="text-sm text-slate-600">
                  Parcourez la recherche pour trouver un nouveau médecin ou reprendre un créneau.
                </p>
                <Button className="mx-auto gap-2" onClick={() => navigate('/search')}>
                  <CalendarDays size={16} /> Rechercher un médecin
                </Button>
              </Card>
            )}
          </MotionCard>

          <MotionCard className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Historique des rendez-vous</h2>
                <p className="text-sm text-slate-600">
                  Les consultations archivées restent visibles et renvoient vers leur détail DB.
                </p>
              </div>
              <Badge variant="info">{filteredHistory.length} éléments</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr,220px]">
              <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <Search size={16} className="text-med-primary" />
                <input
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder="Rechercher medecin/specialite..."
                  className="w-full bg-transparent outline-none"
                />
              </label>
              <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <ArrowUpDown size={16} className="text-med-primary" />
                <select
                  value={historySort}
                  onChange={(event) => setHistorySort(event.target.value)}
                  className="w-full bg-transparent outline-none"
                >
                  <option value="recent">Plus recent</option>
                  <option value="doctor">Nom medecin</option>
                  <option value="status">Statut</option>
                </select>
              </label>
            </div>

            <div className="space-y-4">
              {filteredHistory.length ? (
                filteredHistory.map((appointment) => (
                  <Card key={appointment.id} className="space-y-4 bg-slate-50/90">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">{appointment.doctorName}</h3>
                          <Badge variant={statusTone[appointment.status] || 'neutral'}>{appointment.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-600">{formatSpecialtyLabel(appointment.specialty)}</p>
                        <p className="text-xs text-slate-500">
                          {formatAppointmentDate(appointment.dateTime, 'fr')}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1 text-amber-500">
                        {renderStars(appointment.rating || 0)}
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-slate-600">{appointment.note}</p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => navigate(`/appointment/${appointment.id}`)}
                      >
                        <Clock3 size={14} /> Voir le détail
                      </Button>
                      {appointment.canReview ? (
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => navigate(`/appointment/${appointment.id}`)}
                        >
                          <MessageSquare size={14} /> Laisser un avis
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2"
                        onClick={() =>
                          navigate(
                            `/search?q=${encodeURIComponent(appointment.specialty)}&ville=${encodeURIComponent(
                              appointment.city || ''
                            )}`
                          )
                        }
                      >
                        <UsersRound size={14} /> Rechercher ce spécialiste
                      </Button>
                      {appointment.reviewReceived ? <Badge variant="success">Avis stocké</Badge> : null}
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="bg-slate-50/90 text-slate-600">
                  Aucun rendez-vous historique n’est encore présent dans la base.
                </Card>
              )}
            </div>
          </MotionCard>

          <MotionCard className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Médecins récurrents</h2>
                <p className="text-sm text-slate-600">
                  Classement basé sur vos consultations archivées et les avis enregistrés.
                </p>
              </div>
              <Badge variant="success">{favoriteDoctors.length} médecins</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {favoriteDoctors.length ? (
                favoriteDoctors.map((doctor) => (
                  <Card key={doctor.id} className="space-y-4 bg-slate-50/90">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={doctor.name} size="md" />
                        <div className="min-w-0">
                          <h3 className="break-words text-base font-semibold text-slate-900">{doctor.name}</h3>
                          <p className="break-words text-sm text-slate-600">{formatSpecialtyLabel(doctor.specialty)}</p>
                        </div>
                      </div>
                      <div className="inline-flex shrink-0 items-center gap-1 text-amber-500">
                        <Star size={14} fill="currentColor" />
                        <span className="text-sm font-semibold text-slate-700">
                          {doctor.averageRating ? doctor.averageRating.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600">
                      <p className="inline-flex items-center gap-2">
                        <MapPin size={14} className="text-med-primary" />
                        <span className="break-words">{doctor.city}</span>
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <Clock3 size={14} className="text-med-primary" />
                        {doctor.appointmentsCount} consultations archivées
                      </p>
                      <p>Dernière visite: {doctor.lastVisit || 'Non renseignée'}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="min-w-[110px]" onClick={() => navigate(`/doctor/${doctor.id}`)}>
                        Voir profil
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-w-[120px]"
                        onClick={() =>
                          navigate(
                            `/search?q=${encodeURIComponent(doctor.specialty)}&ville=${encodeURIComponent(
                              doctor.city || ''
                            )}`
                          )
                        }
                      >
                        Rechercher plus
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="bg-slate-50/90 text-slate-600">
                  Aucun médecin récurrent n’est encore dérivé de votre historique.
                </Card>
              )}
            </div>
          </MotionCard>
        </div>

        <div className="space-y-6">
          <MotionCard className="space-y-5 bg-gradient-to-br from-cyan-50 to-white">
            <div className="flex items-center gap-3">
              <Avatar name={profile.displayName || profile.email || 'Compte patient'} size="lg" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">Profil médical</h2>
                <p className="text-sm text-slate-600">Les champs affichés proviennent de la base de données.</p>
              </div>
            </div>

            {medicalProfile.bookingWarnings > 0 ? (
              <Card className="border-amber-200 bg-amber-50/80">
                <div className="space-y-2">
                  <Badge variant="warning">Compte sous surveillance</Badge>
                  <p className="text-sm text-amber-900">
                    {medicalProfile.bookingWarnings} avertissement(s) no-show sont enregistrés sur ce compte.
                  </p>
                  <p className="text-xs text-amber-800">
                    Les prochains médecins verront cet avertissement avant de confirmer un rendez-vous.
                  </p>
                  {medicalProfile.lastNoShowAt ? (
                    <p className="text-xs text-amber-800">
                      Dernier no-show: {dateFormatter.format(new Date(medicalProfile.lastNoShowAt))}
                    </p>
                  ) : null}
                </div>
              </Card>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Identité</p>
                <p className="mt-1 font-semibold text-slate-900">{profile.displayName || 'Compte patient'}</p>
                <p className="text-sm text-slate-600">{profile.email || 'Email non renseigné'}</p>
              </div>
              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Contact</p>
                <p className="mt-1 font-semibold text-slate-900">{profile.phone || 'Téléphone non renseigné'}</p>
                <p className="text-sm text-slate-600">{profile.city || 'Ville non renseignée'}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="space-y-2 bg-white/80">
                <p className="text-sm font-semibold text-slate-900">Adresse</p>
                <p className="text-sm text-slate-600">{medicalProfile.address || 'Adresse non renseignée'}</p>
              </Card>
              <Card className="space-y-2 bg-white/80">
                <p className="text-sm font-semibold text-slate-900">Dossier biologique</p>
                <p className="text-sm text-slate-600">
                  Groupe sanguin: {medicalProfile.bloodGroup || 'Non renseigné'}
                </p>
                <p className="text-sm text-slate-600">Antécédents: {medicalProfile.antecedents || 'Aucun'}</p>
              </Card>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="space-y-1 bg-white/80">
                <p className="text-xs uppercase tracking-wide text-slate-500">Naissance</p>
                <p className="font-semibold text-slate-900">
                  {medicalProfile.dateOfBirth
                    ? dateFormatter.format(new Date(medicalProfile.dateOfBirth))
                    : 'Non renseigné'}
                </p>
                <p className="text-sm text-slate-600">
                  Âge: {profile.age !== undefined && profile.age !== null ? `${profile.age} ans` : 'Non renseigné'}
                </p>
              </Card>
              <Card className="space-y-1 bg-white/80">
                <p className="text-xs uppercase tracking-wide text-slate-500">Genre</p>
                <p className="font-semibold text-slate-900">{profile.gender || 'Non renseigné'}</p>
                <p className="text-sm text-slate-600">Dernière mise à jour depuis la base</p>
              </Card>
            </div>

            <p className="text-xs text-slate-500">{medicalProfile.notes || 'Dossier chargé depuis la base de données.'}</p>
          </MotionCard>

          <MotionCard className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Centre de notifications</h2>
                <p className="text-sm text-slate-600">
                  Les notifications sont chargées depuis la base, sans simulation locale.
                </p>
              </div>
              <Badge variant="success">{notifications.length} messages</Badge>
            </div>

            <div className="space-y-3">
              {notifications.length ? (
                notifications.map((notification) => (
                  <Card key={notification.id} className="space-y-3 bg-slate-50/90">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                          <Badge variant={notificationTone[notification.type] || 'neutral'}>{notification.type}</Badge>
                          {!notification.isRead ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-med-secondary" />
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-600">{notification.body}</p>
                        <p className="text-xs text-slate-500">{notification.time}</p>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="bg-slate-50/90 text-slate-600">Aucune notification récente.</Card>
              )}
            </div>
          </MotionCard>

          {reviewPrompt ? (
            <MotionCard className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-med-accent" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Dernier rendez-vous à commenter</h2>
                  <p className="text-sm text-slate-600">
                    Les avis sont maintenant dérivés du rendez-vous stocké en base.
                  </p>
                </div>
              </div>

              <Card className="space-y-2 bg-slate-50/90">
                <p className="text-xs uppercase tracking-wide text-slate-500">Consultation cible</p>
                <p className="font-semibold text-slate-900">{reviewPrompt.doctorName}</p>
                <p className="text-sm text-slate-600">{formatSpecialtyLabel(reviewPrompt.specialty)}</p>
                <p className="text-xs text-slate-500">{formatAppointmentDate(reviewPrompt.dateTime, 'fr')}</p>
              </Card>

              <Button className="gap-2" onClick={() => navigate(`/appointment/${reviewPrompt.id}`)}>
                <MessageSquare size={16} /> Laisser un avis
              </Button>
            </MotionCard>
          ) : null}
        </div>
      </section>
    </MotionDiv>
  );
}

export default DashboardPatientPage;
