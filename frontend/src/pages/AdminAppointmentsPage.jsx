import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import { formatAppointmentReference } from '../lib/reference';

const statusTone = {
  EN_ATTENTE: 'warning',
  CONFIRME: 'success',
  COMPLETE: 'info',
  ANNULE: 'neutral',
  NO_SHOW: 'warning',
};

function AdminAppointmentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const qStatus = searchParams.get('status');
    if (qStatus) setStatus(qStatus);
  }, [searchParams]);


  const appointmentsQuery = useQuery({
    queryKey: ['admin-appointments', page, status, search],
    queryFn: async () => {
      const response = await api.get('/admin/appointments', {
        params: { page, limit: 15, status, search },
      });
      return response.data?.data;
    },
  });

  const items = appointmentsQuery.data?.items || [];
  const pagination = appointmentsQuery.data?.pagination;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Gestion des Rendez-vous</h1>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'EN_ATTENTE', 'CONFIRME', 'COMPLETE', 'ANNULE'].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? undefined : 'outline'}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s === 'ALL' ? 'Tous' : s}
            </Button>
          ))}
        </div>
      </header>

      <Card className="flex flex-wrap items-center gap-3">
        <label className="inline-flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <Search size={16} className="text-med-primary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par ID, motif, médecin ou patient..."
            className="w-full bg-transparent outline-none"
          />
        </label>
      </Card>

      {appointmentsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((rdv) => (
            <Card key={rdv.id} className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ref: {formatAppointmentReference(rdv.id)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {new Date(rdv.dateTime).toLocaleString('fr-MA')}
                    </p>
                  </div>
                  <Badge variant={statusTone[rdv.status] || 'neutral'}>{rdv.status}</Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Médecin</p>
                  <p className="text-sm font-semibold text-slate-900">{rdv.doctor.name}</p>
                  <p className="text-xs text-slate-600">{rdv.doctor.specialty}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Patient</p>
                  <p className="text-sm font-semibold text-slate-900">{rdv.patient.name}</p>
                  <p className="text-xs text-slate-600">{rdv.patient.email}</p>
                </div>

                <div className="rounded-xl bg-slate-50 p-2 text-xs text-slate-700">
                  <p className="font-semibold">Motif:</p>
                  <p className="mt-1 line-clamp-2">{rdv.reason || '—'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/appointment/${rdv.id}`)}
                >
                  Voir détails complets
                </Button>
              </div>
            </Card>
          ))}
          {!items.length ? (
            <p className="py-10 text-center text-sm text-slate-600 md:col-span-2 xl:col-span-3">
              Aucun rendez-vous trouvé.
            </p>
          ) : null}
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrevPage}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </Button>
          <span className="text-sm text-slate-600">
            Page {pagination.page} sur {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default AdminAppointmentsPage;
