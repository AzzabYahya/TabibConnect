import { useMutation } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import {
  Bell,
  CalendarClock,
  ExternalLink,
  MapPin,
  Phone,
  RotateCcw,
  Star,
  Video,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

import AppointmentCabinetMap from '../../components/appointment/AppointmentCabinetMap';
import OrdonnanceExistingView from '../../components/appointment/OrdonnanceExistingView';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatAppointmentReference } from '../../lib/reference';
import {
  AppointmentStatusBadge,
  canCancelBeforeDeadline,
  getInitials,
  getPreparationTips,
  isFutureAppointment,
  PATIENT_HEADER_GRADIENT,
} from './appointmentShared';

const TeleconsultationVideoPanel = lazy(() => import('../../components/common/TeleconsultationVideoPanel'));

function PatientAppointmentView({ appointment, onRefresh }) {
  const navigate = useNavigate();
  const reference = formatAppointmentReference(appointment.id);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const tips = getPreparationTips(appointment.reason);
  const canCancel = canCancelBeforeDeadline(appointment);
  const showPrep = ['EN_ATTENTE', 'CONFIRME'].includes(appointment.status);
  const reminderAt = subHours(new Date(appointment.dateTime), appointment.reminderHoursBefore ?? 24);

  const cancelMutation = useMutation({
    mutationFn: () => api.put(`/appointments/${appointment.id}/cancel`, { reason: 'Annulation patient' }),
    onSuccess: () => {
      toast.success('Rendez-vous annulé.');
      onRefresh();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Annulation impossible.'),
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      api.post(`/appointments/${appointment.id}/review`, {
        note: rating,
        commentaire: comment || undefined,
      }),
    onSuccess: () => {
      toast.success('Merci pour votre avis.');
      onRefresh();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Publication impossible.'),
  });

  const resendOrdonnanceMutation = useMutation({
    mutationFn: () => api.post(`/appointments/${appointment.id}/ordonnance/resend`),
    onSuccess: () => toast.success('Ordonnance renvoyée par email.'),
    onError: (e) => toast.error(e?.response?.data?.message || 'Renvoi impossible.'),
  });

  const mapsUrl = appointment.cabinet
    ? `https://maps.google.com/?q=${encodeURIComponent(`${appointment.cabinet.address}, ${appointment.cabinet.city}`)}`
    : null;

  const headerGradient = PATIENT_HEADER_GRADIENT[appointment.status] || PATIENT_HEADER_GRADIENT.CONFIRME;

  const renderActions = () => {
    if (['EN_ATTENTE', 'CONFIRME'].includes(appointment.status)) {
      if (!canCancel) {
        return (
          <p className="text-sm text-amber-800">
            L annulation n est plus possible à moins de {appointment.freeCancellationHours ?? 2}h du rendez-vous.
          </p>
        );
      }
      return (
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/doctor/${appointment.doctor.id}`)}>
            <CalendarClock size={16} className="mr-1" />
            Reprogrammer
          </Button>
          <Button variant="outline" className="border-red-300 text-red-700" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Annuler ce RDV
          </Button>
        </div>
      );
    }
    if (appointment.status === 'COMPLETE') {
      return (
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => navigate(`/doctor/${appointment.doctor.id}`)}>
            <RotateCcw size={16} className="mr-1" />
            Re-réserver ce médecin
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <section className={`rounded-xl bg-gradient-to-b ${headerGradient} p-6 text-center shadow-sm`}>
        <div className="mb-3 flex justify-center">
          <AppointmentStatusBadge status={appointment.status} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Votre rendez-vous avec Dr. {appointment.doctor.name}</h1>
        <p className="mt-1 text-slate-600">{appointment.doctor.specialty}</p>
        <p className="mt-3 inline-flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
          <span>{format(new Date(appointment.dateTime), 'PPPP', { locale: fr })}</span>
          <span>{format(new Date(appointment.dateTime), 'HH:mm', { locale: fr })}</span>
          {appointment.cabinet ? (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} />
              {appointment.cabinet.city}
            </span>
          ) : null}
        </p>
        <p className="mt-2 text-xs text-slate-500">Référence : {reference}</p>
        <div className="mt-4">{renderActions()}</div>
        {appointment.typeConsultation === 'TELECONSULTATION' && appointment.status === 'CONFIRME' ? (
          <div className="mx-auto mt-4 max-w-md">
            <Suspense fallback={<Skeleton className="h-32" />}>
              <TeleconsultationVideoPanel
                appointmentId={appointment.id}
                doctorName={appointment.doctor.name}
                joinUrl={appointment.joinUrl}
              />
            </Suspense>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[11fr,9fr]">
        <div className="space-y-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-med-primary/10 text-xl font-bold text-med-primary">
                {getInitials(appointment.doctor.name)}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">Dr. {appointment.doctor.name}</p>
                <p className="text-sm text-slate-600">{appointment.doctor.specialty}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-amber-700">
                  <Star size={14} fill="currentColor" />
                  {appointment.doctor.averageRating?.toFixed(1) || '—'} ({appointment.doctor.reviewCount || 0} avis)
                </p>
              </div>
            </div>
            {(appointment.doctor.languages || []).length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {appointment.doctor.languages.map((lang) => (
                  <span key={lang} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {lang}
                  </span>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className="mt-3 text-sm font-medium text-med-primary hover:underline"
              onClick={() => navigate(`/doctor/${appointment.doctor.id}`)}
            >
              Voir le profil complet →
            </button>
          </div>

          {showPrep ? (
            <div className="rounded-xl bg-[#E8F4F8] p-5">
              <h3 className="mb-3 font-semibold text-slate-900">À préparer avant votre RDV</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {appointment.ordonnance ? (
            <div className="rounded-xl bg-green-50 p-5">
              <h3 className="mb-3 font-semibold text-green-900">Ordonnance disponible</h3>
              <OrdonnanceExistingView
                ordonnance={appointment.ordonnance}
                variant="patient"
                onResend={() => resendOrdonnanceMutation.mutate()}
                resendLabel="Renvoyer par email"
                resendPending={resendOrdonnanceMutation.isPending}
                showQr
              />
            </div>
          ) : null}

          {appointment.status === 'COMPLETE' && appointment.canReview ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 font-semibold text-slate-900">Votre expérience avec Dr. {appointment.doctor.name}</h3>
              <div className="mb-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={value <= rating ? 'text-amber-500' : 'text-slate-300'}
                  >
                    <Star size={28} fill={value <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Partagez votre expérience (optionnel)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button onClick={() => reviewMutation.mutate()} disabled={!rating || reviewMutation.isPending}>
                Publier mon avis
              </Button>
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          {appointment.typeConsultation === 'PRESENTIEL' && appointment.cabinet ? (
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="mb-2 font-semibold text-slate-900">Où se rendre</h3>
              <p className="font-medium text-slate-800">{appointment.cabinet.name}</p>
              <p className="text-sm text-slate-600">{appointment.cabinet.address}</p>
              <p className="text-sm text-slate-600">{appointment.cabinet.city}</p>
              <div className="my-3">
                <AppointmentCabinetMap
                  mapKey={`appointment-patient-${appointment.id}`}
                  latitude={appointment.cabinet.latitude}
                  longitude={appointment.cabinet.longitude}
                  height={160}
                />
              </div>
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full">
                    <ExternalLink size={16} className="mr-1" />
                    Itinéraire Google Maps
                  </Button>
                </a>
              ) : null}
              {appointment.cabinet.phone ? (
                <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600">
                  <Phone size={14} />
                  {appointment.cabinet.phone}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-xl bg-slate-50 p-4">
            <h3 className="mb-2 inline-flex items-center gap-2 font-semibold text-slate-900">
              <Wallet size={16} />
              Détails financiers
            </h3>
            <p className="text-sm text-slate-700">
              Tarif : <strong>{appointment.doctor.fee} MAD</strong>
            </p>
            <p className="text-sm text-slate-700">
              Méthode : {appointment.methodePaiement === 'CASH' ? 'Espèces sur place' : 'Carte bancaire (CMI)'}
            </p>
            <div className="mt-2">
              {appointment.payment?.paid ? (
                <Badge variant="success">Payé</Badge>
              ) : (
                <Badge variant="warning">Paiement en attente</Badge>
              )}
            </div>
            {appointment.methodePaiement === 'CASH' ? (
              <p className="mt-2 text-xs text-slate-600">Règlement sur place à la consultation.</p>
            ) : (
              <p className="mt-2 text-xs text-slate-600">
                Statut transaction : {appointment.payment?.status || 'En attente'}
              </p>
            )}
          </div>

          {isFutureAppointment(appointment) ? (
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="inline-flex items-center gap-2 font-semibold text-amber-900">
                <Bell size={16} />
                Rappels
              </p>
              <p className="mt-2 text-sm text-amber-900">
                Vous recevrez un rappel par email et SMS {appointment.reminderHoursBefore ?? 24}h avant votre rendez-vous.
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Heure prévue du rappel : {format(reminderAt, "PPPP 'à' HH:mm", { locale: fr })}
              </p>
            </div>
          ) : null}

          {appointment.typeConsultation === 'TELECONSULTATION' && appointment.status === 'CONFIRME' ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-center">
              <Video size={24} className="mx-auto text-teal-700" />
              <p className="mt-2 text-sm text-teal-900">Rejoignez la consultation vidéo depuis l en-tête de cette page.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default PatientAppointmentView;
