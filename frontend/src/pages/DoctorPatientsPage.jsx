import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

function DoctorPatientsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);

  const patientsQuery = useQuery({
    queryKey: ['doctor-patients', page, search],
    queryFn: async () => {
      const response = await api.get('/doctors/me/patients', { params: { page, limit: 15, search } });
      return response.data?.data;
    },
  });

  const historyQuery = useQuery({
    enabled: Boolean(selected),
    queryKey: ['doctor-patient-history', selected?.id, historyPage],
    queryFn: async () => {
      const response = await api.get(`/doctors/me/patients/${selected.id}/history`, { params: { page: historyPage, limit: 20 } });
      return response.data?.data;
    },
  });

  const items = patientsQuery.data?.items || [];
  const pagination = patientsQuery.data?.pagination;

  const historyItems = historyQuery.data?.items || [];
  const historyPagination = historyQuery.data?.pagination;

  const subtitle = useMemo(() => `${pagination?.total || items.length} patients`, [pagination, items.length]);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Patients</p>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Recherche par nom/email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      <Card className="space-y-2">
        {patientsQuery.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((p) => (
              <div key={p.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={p.firstName} size="md" />
                    <div>
                      <p className="font-semibold text-slate-900">{p.firstName}</p>
                      <p className="text-xs text-slate-500">{p.email}</p>
                      <p className="text-xs text-slate-500">{p.city}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-600">
                    <p>{p.consultations} consultations</p>
                    <p>Dernière visite: {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString('fr-MA') : '—'}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => { setSelected(p); setHistoryPage(1); }}>
                    Voir historique
                  </Button>
                </div>
              </div>
            ))}
            {!items.length ? <p className="text-sm text-slate-600">Aucun patient.</p> : null}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={!pagination?.hasPrevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>←</Button>
        <span className="text-sm">{pagination?.page || 1} / {pagination?.totalPages || 1}</span>
        <Button variant="outline" size="sm" disabled={!pagination?.hasNextPage} onClick={() => setPage((p) => p + 1)}>→</Button>
      </div>

      {selected ? (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl border-l bg-white p-4 shadow-2xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Historique patient</p>
              <p className="text-sm text-slate-600">{selected.firstName} • {selected.email}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Fermer</Button>
          </div>

          <div className="space-y-2">
            {historyQuery.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              historyItems.map((rdv) => (
                <Card key={rdv.id} className="bg-slate-50/90">
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(rdv.dateTime).toLocaleString('fr-MA')} • {rdv.status}
                  </p>
                  <p className="text-sm text-slate-700">Motif: {rdv.reason}</p>
                  {rdv.doctorNotes?.length ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                      {rdv.doctorNotes.map((n) => (
                        <p key={n.id} className="text-sm text-slate-700">
                          - {n.note}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ))
            )}
            {!historyQuery.isLoading && !historyItems.length ? <p className="text-sm text-slate-600">Aucun RDV.</p> : null}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={!historyPagination?.hasPrevPage} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}>←</Button>
            <span className="text-sm">{historyPagination?.page || 1} / {historyPagination?.totalPages || 1}</span>
            <Button variant="outline" size="sm" disabled={!historyPagination?.hasNextPage} onClick={() => setHistoryPage((p) => p + 1)}>→</Button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

export default DoctorPatientsPage;
