import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

function AdminPatientsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    setPage(1);
  }, [search, city, sortBy, sortDir]);

  const query = useQuery({
    queryKey: ['admin-patients-tab', page, search, city, sortBy, sortDir],
    queryFn: async () => {
      const response = await api.get('/admin/users', {
        params: {
          page,
          limit: 20,
          role: 'PATIENT',
          search,
          city,
          status: 'ALL',
          sortBy,
          sortDir,
        },
      });
      return response.data?.data;
    },
  });

  const patients = query.data?.items || [];
  const pagination = query.data?.pagination;

  return (
    <div className="space-y-4">
      <Card className="grid gap-2 md:grid-cols-5">
        <input
          className="rounded-xl border px-3 py-2 text-sm"
          placeholder="Recherche patient..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <input
          className="rounded-xl border px-3 py-2 text-sm"
          placeholder="Ville..."
          value={city === 'ALL' ? '' : city}
          onChange={(event) => setCity(event.target.value || 'ALL')}
        />
        <select className="rounded-xl border px-3 py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="createdAt">Tri: Date création</option>
          <option value="name">Tri: Nom</option>
          <option value="email">Tri: Email</option>
          <option value="status">Tri: Statut</option>
        </select>
        <select className="rounded-xl border px-3 py-2 text-sm" value={sortDir} onChange={(event) => setSortDir(event.target.value)}>
          <option value="desc">Ordre: Descendant</option>
          <option value="asc">Ordre: Ascendant</option>
        </select>
        <div className="rounded-xl border bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Patients sur cette page: <span className="font-semibold">{patients.length}</span>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <table className="tc-table min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Patient</th>
                <th>Email</th>
                <th>Ville</th>
                <th>Statut</th>
                <th>Créé le</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  className="cursor-pointer border-t hover:bg-slate-50"
                  onClick={() => navigate(`/dashboard/admin/accounts/${patient.id}`)}
                >
                  <td className="py-2 font-semibold text-slate-900">{patient.name}</td>
                  <td>{patient.email}</td>
                  <td>{patient.city || '-'}</td>
                  <td>{patient.isVerified ? 'ACTIF' : 'INACTIF'}</td>
                  <td>{new Date(patient.createdAt).toLocaleDateString('fr-MA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={!pagination?.hasPrevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          ←
        </Button>
        <span className="text-sm">{pagination?.page || 1} / {pagination?.totalPages || 1}</span>
        <Button variant="outline" size="sm" disabled={!pagination?.hasNextPage} onClick={() => setPage((p) => p + 1)}>
          →
        </Button>
      </div>
    </div>
  );
}

export default AdminPatientsPage;
export default AdminPatientsPage;
