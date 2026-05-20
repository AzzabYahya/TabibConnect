import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';


import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import useRealtimeDashboard from '../hooks/useRealtimeDashboard';
import { formatAppointmentReference } from '../lib/reference';

const statusClass = {
  EN_ATTENTE: 'border-amber-200 bg-amber-50 text-amber-900',
  CONFIRME: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  COMPLETE: 'border-slate-200 bg-slate-50 text-slate-800',
  ANNULE: 'border-red-200 bg-red-50 text-red-900',
  NO_SHOW: 'border-amber-200 bg-amber-50 text-amber-900',
};

const dayFormatter = new Intl.DateTimeFormat('fr-MA', { weekday: 'short', day: '2-digit', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('fr-MA', { hour: '2-digit', minute: '2-digit' });

function toLocalDateKey(input) {
  const d = new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeekISO(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return toLocalDateKey(d);
}

function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
}


function DoctorAgendaPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [weekStart, setWeekStart] = useState(startOfWeekISO(new Date()));
  const [selected, setSelected] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [note, setNote] = useState('');

  const query = useQuery({
    queryKey: ['doctor-agenda', weekStart],
    queryFn: async () => {
      const response = await api.get('/doctors/me/agenda', { params: { weekStart } });
      return response.data?.data;
    },
  });

  useRealtimeDashboard({
    onDoctorPending: () => query.refetch(),
    onNotification: () => query.refetch(),
  });

  const confirmMutation = useMutation({
    mutationFn: async (appointmentId) => api.put(`/appointments/${appointmentId}/confirm`),
    onSuccess: async () => {
      toast.success('RDV confirmé.');
      await query.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Confirmation impossible.'),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ appointmentId, reason }) => api.put(`/appointments/${appointmentId}/cancel`, { reason }),
    onSuccess: async () => {
      toast.success('RDV annulé.');
      setCancelReason('');
      await query.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Annulation impossible.'),
  });

  const noteMutation = useMutation({
    mutationFn: async ({ appointmentId, noteText }) => api.post(`/appointments/${appointmentId}/patient-note`, { note: noteText }),
    onSuccess: async () => {
      toast.success('Note ajoutée.');
      setNote('');
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Ajout note impossible.'),
  });

  const items = query.data?.items || [];
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(addDaysISO(weekStart, i))),
    [weekStart]
  );

  const itemsByDay = useMemo(() => {
    const map = {};
    items.forEach((rdv) => {
      const key = toLocalDateKey(rdv.dateTime);
      map[key] = map[key] || [];
      map[key].push(rdv);
    });
    Object.keys(map).forEach((k) => map[k].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)));
    return map;
  }, [items]);

  const weekLabel = `${dayFormatter.format(weekDays[0])} → ${dayFormatter.format(weekDays[6])}`;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{t('dashboard.agenda.week')}</p>
          <p className="text-sm text-slate-600">{weekLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDaysISO(weekStart, -7))}>
            <ChevronLeft size={16} /> {t('dashboard.agenda.previous')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeekISO(new Date()))}>
            {t('dashboard.agenda.today')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDaysISO(weekStart, 7))}>
            {t('dashboard.agenda.next')} <ChevronRight size={16} />
          </Button>
        </div>
      </Card>

      {query.isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Card className="py-3">
              <p className="text-xs text-slate-500">{t('dashboard.agenda.weekAppointments')}</p>
              <p className="text-2xl font-bold text-slate-900">{items.length}</p>
            </Card>
            <Card className="py-3">
              <p className="text-xs text-slate-500">{t('dashboard.agenda.pending')}</p>
              <p className="text-2xl font-bold text-amber-700">{items.filter((i) => i.status === 'EN_ATTENTE').length}</p>
            </Card>
            <Card className="py-3">
              <p className="text-xs text-slate-500">{t('dashboard.agenda.confirmed')}</p>
              <p className="text-2xl font-bold text-emerald-700">{items.filter((i) => i.status === 'CONFIRME').length}</p>
            </Card>
            <Card className="py-3">
              <p className="text-xs text-slate-500">{t('dashboard.agenda.completed')}</p>
              <p className="text-2xl font-bold text-slate-700">{items.filter((i) => i.status === 'COMPLETE').length}</p>
            </Card>
          </div>

          {items.length === 0 ? (
            <Card className="py-10 text-center">
              <p className="text-lg font-semibold text-slate-900">{t('dashboard.agenda.noAppointmentsWeek')}</p>
              <p className="mt-1 text-sm text-slate-600">{t('dashboard.agenda.noAppointmentsWeekHint')}</p>
            </Card>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border bg-white">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b bg-slate-50">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500">{t('dashboard.agenda.hour')}</div>
              {weekDays.map((d) => (
                <div key={d.toISOString()} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {dayFormatter.format(d)}
                </div>
              ))}
            </div>

            {Array.from({ length: 11 }, (_, i) => 8 + i).map((hour) => (
              <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b last:border-b-0">
                <div className="px-3 py-3 text-xs text-slate-500">{String(hour).padStart(2, '0')}:00</div>
                {weekDays.map((d) => {
                  const dayKey = toLocalDateKey(d);
                  const list = (itemsByDay[dayKey] || []).filter((rdv) => new Date(rdv.dateTime).getHours() === hour);
                  return (
                    <div key={`${dayKey}-${hour}`} className="min-h-[64px] px-2 py-2">
                      {list.length ? (
                        <div className="space-y-2">
                          {list.map((rdv) => (
                            <button
                              key={rdv.id}
                              type="button"
                              onClick={() => setSelected(rdv)}
                              className={`w-full rounded-xl border px-2 py-2 text-left text-xs transition hover:shadow ${statusClass[rdv.status] || 'border-slate-200 bg-slate-50'}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold">{rdv.patient?.firstName}</p>
                                <Badge variant="neutral">{rdv.status}</Badge>
                              </div>
                              <p className="mt-1 text-[11px] opacity-80">
                                {timeFormatter.format(new Date(rdv.dateTime))} • {rdv.type}
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full rounded-xl bg-slate-50/60" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {selected ? (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l bg-white p-4 shadow-2xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Reference {formatAppointmentReference(selected.id)}</p>
              <p className="text-sm text-slate-600">
                {selected.patient?.firstName} • {new Date(selected.dateTime).toLocaleString('fr-MA')}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSelected(null)}>{t('dashboard.agenda.close')}</Button>
          </div>

          <div className="space-y-3">
            <Card className="bg-slate-50/90">
              <p className="text-sm font-semibold text-slate-900">{t('dashboard.agenda.details')}</p>
              <p className="text-sm text-slate-700">{t('dashboard.agenda.reason')}: {selected.reason}</p>
              <p className="text-sm text-slate-700">{t('dashboard.agenda.status')}: {selected.status}</p>
              <p className="text-sm text-slate-700">{t('dashboard.agenda.type')}: {selected.type}</p>
              <p className="text-sm text-slate-700">
                {t('dashboard.agenda.office')}: {selected.cabinet?.name ? `${selected.cabinet.name} • ${selected.cabinet.city}` : t('dashboard.agenda.notAvailable')}
              </p>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => confirmMutation.mutate(selected.id)}
                disabled={confirmMutation.isPending || selected.status !== 'EN_ATTENTE'}
              >
                {t('dashboard.agenda.confirm')}
              </Button>
              <Button
                variant="outline"
                onClick={() => cancelMutation.mutate({ appointmentId: selected.id, reason: cancelReason })}
                disabled={cancelMutation.isPending || cancelReason.trim().length < 3 || !['EN_ATTENTE', 'CONFIRME'].includes(selected.status)}
              >
                {t('dashboard.agenda.cancel')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/appointment/${selected.id}`)}
              >
                Voir fiche complète
              </Button>
            </div>


            <textarea
              className="w-full rounded-xl border px-3 py-2 text-sm"
              rows={3}
              placeholder={t('dashboard.agenda.cancelReasonPlaceholder')}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />

            <Card className="space-y-2 bg-slate-50/90">
              <p className="text-sm font-semibold text-slate-900">{t('dashboard.agenda.addNote')}</p>
              <textarea className="w-full rounded-xl border px-3 py-2 text-sm" rows={4} placeholder={t('dashboard.agenda.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button
                onClick={() => noteMutation.mutate({ appointmentId: selected.id, noteText: note })}
                disabled={noteMutation.isPending || note.trim().length < 3}
              >
                {t('dashboard.agenda.saveNote')}
              </Button>
            </Card>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

export default DoctorAgendaPage;
