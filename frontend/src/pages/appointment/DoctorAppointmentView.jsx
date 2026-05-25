import { useMutation } from '@tanstack/react-query';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ClipboardList,
  FileUp,
  PenLine,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import AppointmentCabinetMap from '../../components/appointment/AppointmentCabinetMap';
import OrdonnanceExistingView from '../../components/appointment/OrdonnanceExistingView';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import api from '../../lib/api';
import { formatAppointmentDate } from '../../lib/date';
import { formatAppointmentReference } from '../../lib/reference';
import {
  antecedentPillClass,
  AppointmentMetaLine,
  AppointmentReferenceLine,
  AppointmentStatusBadge,
  getInitials,
  NotesIcon,
  SavedIndicator,
  SectionCard,
  STATUS_LABELS,
  WarningsCard,
} from './appointmentShared';

const TeleconsultationVideoPanel = lazy(() => import('../../components/common/TeleconsultationVideoPanel'));

function DoctorAppointmentView({ appointment, onRefresh, language }) {
  const navigate = useNavigate();
  const profile = appointment.patientProfile;
  const reference = formatAppointmentReference(appointment.id);

  const [noteForm, setNoteForm] = useState({ note: '', isVisibleToPeers: false });
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ordonnanceTab, setOrdonnanceTab] = useState('write');
  const [medInput, setMedInput] = useState({ medicament: '', posologie: '' });
  const [medicaments, setMedicaments] = useState([]);
  const [instructions, setInstructions] = useState('');
  const [renouvelable, setRenouvelable] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const autoSaveTimer = useRef(null);
  const lastSavedNote = useRef('');

  const confirmMutation = useMutation({
    mutationFn: () => api.put(`/appointments/${appointment.id}/confirm`),
    onSuccess: () => {
      toast.success('Rendez-vous confirmé.');
      onRefresh();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Confirmation impossible.'),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.put(`/appointments/${appointment.id}/complete`),
    onSuccess: () => {
      toast.success('Rendez-vous marqué comme terminé.');
      onRefresh();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Mise à jour impossible.'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.put(`/appointments/${appointment.id}/cancel`, { reason: 'Annulation médecin' }),
    onSuccess: () => {
      toast.success('Rendez-vous annulé.');
      onRefresh();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Annulation impossible.'),
  });

  const createOrdonnanceMutation = useMutation({
    mutationFn: () =>
      api.post(`/appointments/${appointment.id}/ordonnance`, {
        medicaments,
        instructions,
        renouvelable,
      }),
    onSuccess: () => {
      toast.success('Ordonnance générée et envoyée au patient.');
      onRefresh();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Génération impossible.'),
  });

  const uploadOrdonnanceMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('file', uploadFile);
      return api.post(`/appointments/${appointment.id}/ordonnance/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Ordonnance envoyée au patient.');
      setUploadFile(null);
      onRefresh();
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Envoi impossible.'),
  });

  const resendOrdonnanceMutation = useMutation({
    mutationFn: () => api.post(`/appointments/${appointment.id}/ordonnance/resend`),
    onSuccess: () => toast.success('Ordonnance renvoyée au patient.'),
    onError: (e) => toast.error(e?.response?.data?.message || 'Renvoi impossible.'),
  });

  const saveNote = useCallback(
    async (silent = false) => {
      if (!noteForm.note.trim() || noteForm.note === lastSavedNote.current) return;
      try {
        setNoteSubmitting(true);
        await api.post(`/appointments/${appointment.id}/patient-note`, noteForm);
        lastSavedNote.current = noteForm.note;
        setNoteSaved(true);
        if (!silent) toast.success('Note enregistrée.');
        await onRefresh();
      } catch (error) {
        if (!silent) toast.error(error?.response?.data?.message || 'Enregistrement impossible.');
      } finally {
        setNoteSubmitting(false);
      }
    },
    [appointment.id, noteForm, onRefresh]
  );

  useEffect(() => {
    if (!noteForm.note.trim()) return undefined;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveNote(true);
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [noteForm, saveNote]);

  const handleAddMedicament = () => {
    if (!medInput.medicament.trim() || !medInput.posologie.trim()) {
      toast.error('Renseignez le médicament et la posologie.');
      return;
    }
    setMedicaments((current) => [...current, { ...medInput }]);
    setMedInput({ medicament: '', posologie: '' });
  };

  const history = profile?.historyAppointments || [];
  const historyVisible = history.slice(0, 10);
  const patientName = profile?.fullName || appointment.patient?.name || 'Patient';

  const renderQuickActions = () => {
    if (appointment.status === 'EN_ATTENTE') {
      return (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
            Confirmer
          </Button>
          <Button variant="outline" className="border-red-300 text-red-700" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Annuler
          </Button>
        </div>
      );
    }
    if (appointment.status === 'CONFIRME') {
      return (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
            Marquer terminé
          </Button>
          <Button variant="outline" className="border-red-300 text-red-700" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Annuler
          </Button>
        </div>
      );
    }
    return (
      <p className="text-sm font-medium text-slate-600">
        Statut final : {STATUS_LABELS[appointment.status] || appointment.status}
      </p>
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <AppointmentStatusBadge status={appointment.status} />
          <div className="flex-1 space-y-2">
            <h1 className="text-xl font-bold text-slate-900">
              Rendez-vous avec {appointment.patient?.firstName || patientName}
            </h1>
            <AppointmentMetaLine appointment={appointment} language={language} />
            <AppointmentReferenceLine appointment={appointment} reference={reference} />
          </div>
          <div className="shrink-0">{renderQuickActions()}</div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[3fr,2fr]">
        <div className="space-y-5">
          {profile ? (
            <div className="rounded-xl border-l-4 border-med-primary bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-med-primary/10 text-lg font-bold text-med-primary">
                  {getInitials(patientName)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{patientName}</p>
                  <p className="text-sm text-slate-600">{profile.email}</p>
                  <p className="text-sm text-slate-600">{profile.phone || 'Téléphone non renseigné'}</p>
                </div>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div><span className="text-slate-500">Ville</span><p className="font-medium">{profile.city || '—'}</p></div>
                <div><span className="text-slate-500">Groupe sanguin</span><p className="font-medium">{profile.bloodGroup || '—'}</p></div>
                <div><span className="text-slate-500">Date naissance</span><p className="font-medium">{profile.dateOfBirth ? formatAppointmentDate(profile.dateOfBirth, language).split(' à')[0] : '—'}</p></div>
                <div><span className="text-slate-500">Sexe</span><p className="font-medium">{profile.sex || '—'}</p></div>
              </div>
              {(profile.antecedentTags || []).length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-800">Antécédents médicaux</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.antecedentTags.map((tag) => (
                      <span key={tag} className={`rounded-full px-3 py-1 text-xs font-medium ${antecedentPillClass(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <WarningsCard count={appointment.patient?.warnings || profile?.warnings} />

          <SectionCard
            title="Notes cliniques"
            icon={NotesIcon}
            badge={<Badge variant="neutral">Privé</Badge>}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <SavedIndicator saved={noteSaved} />
              </div>
              <textarea
                rows={5}
                value={noteForm.note}
                onChange={(e) => {
                  setNoteSaved(false);
                  setNoteForm((c) => ({ ...c, note: e.target.value }));
                }}
                placeholder="Observations, diagnostic, recommandations..."
                className="min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-med-primary focus:outline-none focus:ring-2 focus:ring-med-primary/20"
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={noteForm.isVisibleToPeers}
                  onChange={(e) => setNoteForm((c) => ({ ...c, isVisibleToPeers: e.target.checked }))}
                />
                Rendre visible aux autres médecins de la plateforme
              </label>
              <Button onClick={() => saveNote(false)} disabled={noteSubmitting}>
                {noteSubmitting ? 'Enregistrement...' : 'Enregistrer la note'}
              </Button>
              <div className="max-h-[200px] space-y-2 overflow-y-auto">
                {(profile?.doctorNotes || []).map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-900">{item.doctorName}</p>
                    <p className="text-xs text-slate-500">
                      {item.isVisibleToPeers ? 'Partagée' : 'Privée'} — {formatAppointmentDate(item.createdAt, language)}
                    </p>
                    <p className="mt-1 text-slate-700">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Ordonnance"
            icon={ClipboardList}
            badge={
              appointment.ordonnance ? (
                <Badge variant="success">Enregistrée</Badge>
              ) : (
                <Badge variant="info">Nouveau</Badge>
              )
            }
          >
            {appointment.ordonnance ? (
              <OrdonnanceExistingView
                ordonnance={appointment.ordonnance}
                language={language}
                onResend={() => resendOrdonnanceMutation.mutate()}
                resendPending={resendOrdonnanceMutation.isPending}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${ordonnanceTab === 'write' ? 'bg-med-primary text-white' : 'text-slate-600'}`}
                    onClick={() => setOrdonnanceTab('write')}
                  >
                    <PenLine size={14} />
                    Rédiger
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${ordonnanceTab === 'upload' ? 'bg-med-primary text-white' : 'text-slate-600'}`}
                    onClick={() => setOrdonnanceTab('upload')}
                  >
                    <FileUp size={14} />
                    Uploader
                  </button>
                </div>

                {ordonnanceTab === 'write' ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Médicament"
                        value={medInput.medicament}
                        onChange={(e) => setMedInput((c) => ({ ...c, medicament: e.target.value }))}
                      />
                      <input
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Posologie"
                        value={medInput.posologie}
                        onChange={(e) => setMedInput((c) => ({ ...c, posologie: e.target.value }))}
                      />
                      <Button type="button" variant="outline" onClick={handleAddMedicament}>
                        <Plus size={16} />
                        Ajouter
                      </Button>
                    </div>
                    <ul className="space-y-2">
                      {medicaments.map((m, index) => (
                        <li key={`${m.medicament}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <span>
                            {m.medicament} — {m.posologie}
                          </span>
                          <button type="button" className="text-red-600" onClick={() => setMedicaments((c) => c.filter((_, i) => i !== index))}>
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Instructions générales (repos, éviter...)"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={renouvelable} onChange={(e) => setRenouvelable(e.target.checked)} />
                      Renouvellement autorisé
                    </label>
                    <Button
                      onClick={() => createOrdonnanceMutation.mutate()}
                      disabled={createOrdonnanceMutation.isPending || medicaments.length === 0}
                    >
                      Générer l ordonnance PDF
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-med-primary px-4 py-8 text-center text-sm text-slate-600">
                      <FileUp size={28} className="mb-2 text-med-primary" />
                      Glissez votre ordonnance ici ou cliquez pour sélectionner
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      />
                      {uploadFile ? <span className="mt-2 font-medium text-slate-800">{uploadFile.name}</span> : null}
                    </label>
                    <Button
                      onClick={() => uploadOrdonnanceMutation.mutate()}
                      disabled={!uploadFile || uploadOrdonnanceMutation.isPending}
                    >
                      <Send size={16} className="mr-1" />
                      Envoyer au patient
                    </Button>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl bg-slate-50 p-4">
            <h3 className="mb-3 font-semibold text-slate-900">Détails paiement</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Tarif</span><p className="font-medium">{appointment.doctor.fee} MAD</p></div>
              <div><span className="text-slate-500">Méthode</span><p className="font-medium">{appointment.methodePaiement === 'CASH' ? 'Espèces' : 'Carte'}</p></div>
              <div><span className="text-slate-500">Statut</span><p className="font-medium">{appointment.payment?.status || '—'}</p></div>
              <div><span className="text-slate-500">Référence</span><p className="font-medium">{appointment.payment?.reference || '—'}</p></div>
            </div>
            <div className="mt-3">
              {appointment.payment?.paid ? (
                <Badge variant="success">Payé</Badge>
              ) : (
                <Badge variant="warning">Paiement en attente</Badge>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="mb-2 font-semibold text-slate-900">Informations cabinet</h3>
            {appointment.cabinet ? (
              <div className="space-y-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{appointment.cabinet.name}</p>
                <p>{appointment.cabinet.address}</p>
                <p>{appointment.cabinet.city}</p>
                <AppointmentCabinetMap
                  mapKey={`appointment-doctor-${appointment.id}`}
                  latitude={appointment.cabinet.latitude}
                  longitude={appointment.cabinet.longitude}
                  height={140}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Cabinet non renseigné</p>
            )}
            {appointment.typeConsultation === 'TELECONSULTATION' ? (
              <div className="mt-4">
                <Suspense fallback={<Skeleton className="h-32" />}>
                  <TeleconsultationVideoPanel
                    appointmentId={appointment.id}
                    doctorName={appointment.doctor.name}
                    joinUrl={appointment.joinUrl}
                  />
                </Suspense>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <Badge variant={appointment.typeConsultation === 'TELECONSULTATION' ? 'info' : 'success'}>
              {appointment.typeConsultation === 'TELECONSULTATION' ? 'Téléconsultation' : 'Présentiel'}
            </Badge>
            <p className="mt-2 text-sm text-slate-600">
              Durée estimée : {appointment.durationMinutes || 30} minutes
            </p>
          </div>
        </div>
      </section>

      {profile ? (
        <section className="rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-4 text-left"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <div>
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                <ClipboardList size={18} className="text-med-primary" />
                Historique des consultations de {appointment.patient?.firstName || patientName}
              </p>
              <p className="text-sm text-slate-500">{history.length} consultations archivées</p>
            </div>
            <ChevronDown size={20} className={`transition ${historyOpen ? 'rotate-180' : ''}`} />
          </button>
          {historyOpen ? (
            <div className="space-y-2 border-t border-slate-100 px-5 py-4">
              {historyVisible.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{item.doctorName}</p>
                    <p className="text-xs text-slate-500">{item.specialty}</p>
                  </div>
                  <p className="text-xs text-slate-600">{formatAppointmentDate(item.dateTime, language)}</p>
                  <AppointmentStatusBadge status={item.status} />
                  <p className="w-full text-xs text-slate-500">{item.reason}</p>
                </div>
              ))}
              {history.length > 10 ? (
                <Button variant="outline" onClick={() => navigate('/dashboard/doctor/patients')}>
                  Voir tout
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default DoctorAppointmentView;
