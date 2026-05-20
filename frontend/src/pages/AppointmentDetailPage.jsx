import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { CalendarDays, Clock3, MapPin, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import { getCurrentSession } from '../lib/auth';
import { formatAppointmentDate } from '../lib/date';
import { formatAppointmentReference } from '../lib/reference';

const TeleconsultationVideoPanel = lazy(() => import('../components/common/TeleconsultationVideoPanel'));

const statusTone = {
  CONFIRME: 'success',
  COMPLETE: 'info',
  ANNULE: 'neutral',
  EN_ATTENTE: 'warning',
  NO_SHOW: 'warning',
};

function AppointmentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { i18n } = useTranslation();

  const appointmentQuery = useQuery({
    queryKey: ['appointment-details', id],
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await api.get(`/appointments/${id}`);
      return response.data?.data;
    },
  });

  const [doctorNoteForm, setDoctorNoteForm] = useState({ note: '', isVisibleToPeers: false });
  const [doctorNoteSubmitting, setDoctorNoteSubmitting] = useState(false);
  const session = getCurrentSession();

  if (appointmentQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-40" />
        <Skeleton className="h-44" />
      </div>
    );
  }

  if (appointmentQuery.isError || !appointmentQuery.data) {
    const requiresLogin = appointmentQuery.error?.response?.status === 401 || appointmentQuery.error?.response?.status === 403;

    return (
      <Card className="space-y-4 border-red-200 bg-red-50/70">
        <div className="space-y-2">
          <Badge variant="warning">{requiresLogin ? 'Connexion requise' : 'Rendez-vous indisponible'}</Badge>
          <h1 className="text-2xl font-bold text-red-900">
            {requiresLogin ? 'Connectez-vous pour consulter ce rendez-vous' : 'Le détail du rendez-vous ne peut pas être chargé'}
          </h1>
          <p className="text-sm text-red-800">
            {requiresLogin
              ? 'Cette page lit un rendez-vous réel et nécessite une session valide.'
              : 'Le rendez-vous demandé n’a pas été trouvé dans la base ou la source de données est indisponible.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {requiresLogin ? (
            <Button onClick={() => navigate('/connexion')}>
              Aller à la connexion
            </Button>
          ) : null}
          <Button onClick={() => appointmentQuery.refetch()} variant="outline">
            Reessayer
          </Button>
          <Button onClick={() => navigate('/dashboard/patient')}>
            Retour au dashboard
          </Button>
        </div>
      </Card>
    );
  }

  const appointment = appointmentQuery.data;
  const canWriteDoctorNote = session.role === 'DOCTOR';

  const handleDoctorNoteSubmit = async (event) => {
    event.preventDefault();
    if (!canWriteDoctorNote) return;
    if (!doctorNoteForm.note.trim()) {
      toast.error('Veuillez saisir une note médecin.');
      return;
    }
    try {
      setDoctorNoteSubmitting(true);
      await api.post(`/appointments/${id}/patient-note`, {
        note: doctorNoteForm.note,
        isVisibleToPeers: doctorNoteForm.isVisibleToPeers,
      });
      toast.success('Note patient enregistrée.');
      setDoctorNoteForm({ note: '', isVisibleToPeers: false });
      await appointmentQuery.refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible d enregistrer la note.');
    } finally {
      setDoctorNoteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Badge variant={statusTone[appointment.status] || 'neutral'}>{appointment.status}</Badge>
        <h1 className="text-3xl font-bold text-slate-900">Détail rendez-vous</h1>
        <p className="text-slate-600">Référence : {formatAppointmentReference(appointment.id)}</p>
      </header>

      <Card className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-slate-500">Médecin</p>
            <p className="text-lg font-semibold text-slate-900">{appointment.doctor.name}</p>
            <p className="text-sm text-slate-600">{appointment.doctor.specialty}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={appointment.typeConsultation === 'TELECONSULTATION' ? 'info' : 'success'}>
              {appointment.typeConsultation === 'TELECONSULTATION' ? 'Teleconsultation' : 'Présentiel'}
            </Badge>
            <Badge variant={appointment.methodePaiement === 'CASH' ? 'warning' : 'info'}>
              {appointment.methodePaiement === 'CASH' ? 'Espèces' : 'Carte bancaire'}
            </Badge>
            <Badge variant={statusTone[appointment.status] || 'neutral'}>{appointment.status}</Badge>
          </div>
        </div>

        {appointment.patient?.warnings > 0 ? (
          <Card className="border-amber-200 bg-amber-50/80">
            <div className="space-y-2">
              <Badge variant="warning">Avertissement patient</Badge>
              <p className="text-sm text-amber-900">
                Ce compte patient a {appointment.patient.warnings} avertissement(s) lié(s) à des no-show ou des annulations non conformes.
              </p>
              <p className="text-xs text-amber-800">
                Les médecins peuvent voir cet indicateur avant de confirmer ou de reprogrammer un rendez-vous.
              </p>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <p className="inline-flex items-center gap-2">
            <CalendarDays size={16} className="text-med-primary" />
            {formatAppointmentDate(appointment.dateTime, i18n.language)}
          </p>
          <p className="inline-flex items-center gap-2">
            <Clock3 size={16} className="text-med-primary" />
            {appointment.durationMinutes || 30} min
          </p>
          <p className="inline-flex items-center gap-2">
            <MapPin size={16} className="text-med-primary" />
            {appointment.cabinet?.label || appointment.cabinet?.address || 'Cabinet non renseigné'}
          </p>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Motif et contexte</h2>
            <p className="text-sm text-slate-600">Les informations ci-dessous proviennent directement de la base.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Motif</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{appointment.reason}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Tarif</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {new Intl.NumberFormat('fr-MA', {
                  style: 'currency',
                  currency: 'MAD',
                  maximumFractionDigits: 0,
                }).format(appointment.doctor.fee || 0)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Conditions</p>
              <p className="mt-1 text-sm text-slate-700">
                {appointment.acceptedGeneralTerms ? 'Conditions générales acceptées.' : 'Conditions non confirmées.'}
              </p>
              {appointment.methodePaiement === 'CASH' ? (
                <p className="mt-1 text-sm text-slate-700">
                  {appointment.acceptedCashPolicy ? 'Conditions espèces acceptées.' : 'Conditions espèces non confirmées.'}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Paiement</p>
              {appointment.payment ? (
                <div className="mt-1 space-y-1 text-sm text-slate-700">
                  <p>
                    Méthode: <span className="font-semibold">{appointment.payment.method === 'CMI' ? 'Carte bancaire' : appointment.payment.method}</span>
                  </p>
                  <p>
                    Statut: <span className="font-semibold">{appointment.payment.status}</span>
                  </p>
                  <p>
                    Référence: <span className="font-semibold">{appointment.payment.reference}</span>
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-700">Aucune transaction enregistrée.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
            <p className="mt-1 text-sm text-slate-700">
              {appointment.notes || appointment.cancellationReason || 'Aucune note additionnelle.'}
            </p>
          </div>

          {appointment.cancellationReason ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Raison d’annulation</p>
              <p className="mt-1 text-sm text-slate-700">{appointment.cancellationReason}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/dashboard/patient')}>Retour au dashboard</Button>
            <Button variant="outline" onClick={() => navigate('/search')}>
              Rechercher un médecin
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 bg-slate-50/90">
          <h2 className="text-xl font-semibold text-slate-900">Cabinet et suivi</h2>

          {appointment.cabinet ? (
            <div className="space-y-3 text-sm text-slate-700">
              <p className="inline-flex items-center gap-2">
                <MapPin size={16} className="text-med-primary" />
                {appointment.cabinet.label}
              </p>
              <p>{appointment.cabinet.address}</p>
              <p>{appointment.cabinet.city}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Aucun cabinet rattaché à ce rendez-vous.</p>
          )}

          {appointment.typeConsultation === 'TELECONSULTATION' ? (
            <Suspense fallback={<Skeleton className="h-44" />}>
              <TeleconsultationVideoPanel
                appointmentId={appointment.id}
                doctorName={appointment.doctor.name}
                joinUrl={appointment.joinUrl}
              />
            </Suspense>
          ) : (
            <Card className="border-dashed bg-white/80 text-sm text-slate-600">
              La consultation est en présentiel et ne dispose pas encore d’un lien de session.
            </Card>
          )}
        </Card>
      </section>

      {session.role === 'DOCTOR' && appointment.patientProfile ? (
        <section className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Profil patient et historique</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Contact</p>
                <p className="mt-1 text-sm text-slate-700">{appointment.patientProfile.email}</p>
                <p className="text-sm text-slate-700">{appointment.patientProfile.phone || 'Téléphone non renseigné'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Avertissements</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{appointment.patientProfile.warnings || 0}</p>
                <p className="text-xs text-slate-600">{appointment.patientProfile.city || 'Ville non renseignée'}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Antécédents</p>
              <p className="mt-1 text-sm text-slate-700">{appointment.patientProfile.antecedents || 'Aucun antécédent renseigné'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Consultations précédentes</p>
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {(appointment.patientProfile.historyAppointments || []).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{item.doctorName}</p>
                    <p className="text-xs text-slate-500">{item.specialty} - {item.status}</p>
                    <p className="text-xs text-slate-500">{formatAppointmentDate(item.dateTime, i18n.language)}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Notes médecin sur patient</h2>
            <form onSubmit={handleDoctorNoteSubmit} className="space-y-3">
              <textarea
                rows={4}
                value={doctorNoteForm.note}
                onChange={(event) => setDoctorNoteForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Ajouter une note clinique, comportementale ou de suivi..."
                className="w-full rounded-[10px] border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm focus:border-med-primary focus:outline-none focus:ring-2 focus:ring-med-primary/20"
              />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={doctorNoteForm.isVisibleToPeers}
                  onChange={(event) => setDoctorNoteForm((current) => ({ ...current, isVisibleToPeers: event.target.checked }))}
                />
                Rendre visible aux autres médecins
              </label>
              <Button type="submit" disabled={doctorNoteSubmitting}>
                {doctorNoteSubmitting ? 'Enregistrement...' : 'Enregistrer la note'}
              </Button>
            </form>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {(appointment.patientProfile.doctorNotes || []).map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{item.doctorName}</p>
                  <p className="text-xs text-slate-500">
                    {item.isVisibleToPeers ? 'Visible aux médecins' : 'Privée'} - {formatAppointmentDate(item.createdAt, i18n.language)}
                  </p>
                  <p className="mt-1">{item.note}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

export default AppointmentDetailPage;
