import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

function DoctorReviewsPage() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('recent'); // recent | best | worst

  const query = useQuery({
    queryKey: ['doctor-reviews-received', page, sort],
    queryFn: async () => {
      const response = await api.get('/doctors/me/reviews', { params: { page, limit: 15, sort } });
      return response.data?.data;
    },
  });

  const items = query.data?.items || [];
  const pagination = query.data?.pagination;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Avis reçus (validés)</p>
        <select className="rounded-xl border px-3 py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Plus récents</option>
          <option value="best">Mieux notés</option>
          <option value="worst">Moins bien notés</option>
        </select>
      </Card>

      <Card className="space-y-2">
        {query.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="space-y-3">
            {items.map((r) => (
              <div key={r.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Patient: {r.patientFirstName}</p>
                    <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString('fr-MA')}</p>
                  </div>
                  <Badge variant="info">{r.rating}/5</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-700">{r.comment || '—'}</p>
              </div>
            ))}
            {!items.length ? <p className="text-sm text-slate-600">Aucun avis validé.</p> : null}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={!pagination?.hasPrevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>←</Button>
        <span className="text-sm">{pagination?.page || 1} / {pagination?.totalPages || 1}</span>
        <Button variant="outline" size="sm" disabled={!pagination?.hasNextPage} onClick={() => setPage((p) => p + 1)}>→</Button>
      </div>
    </div>
  );
}

export default DoctorReviewsPage;
