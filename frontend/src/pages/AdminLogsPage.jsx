import { useQuery } from '@tanstack/react-query';
import { Activity, Bell, CreditCard, LogIn } from 'lucide-react';
import { useMemo, useState } from 'react';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

const iconByType = {
  RDV: Activity,
  NOTIFICATION: Bell,
  AUTH: LogIn,
  PAIEMENT: CreditCard,
};

function AdminLogsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('ALL');

  const query = useQuery({
    queryKey: ['admin-logs', page, type],
    queryFn: async () => {
      const response = await api.get('/admin/logs', { params: { page, limit: 20, type } });
      return response.data?.data;
    },
  });

  const items = query.data?.items || [];
  const pagination = query.data?.pagination;
  const timeline = useMemo(() => items.map((item) => ({ ...item, at: new Date(item.at) })), [items]);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Journal d’activité</p>
        <select className="rounded-xl border px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="ALL">Tous</option>
          <option value="RDV">RDV</option>
          <option value="NOTIFICATION">Notification</option>
          <option value="AUTH">Auth</option>
          <option value="PAIEMENT">Paiement</option>
        </select>
      </Card>

      <Card className="space-y-3">
        {query.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="space-y-3">
            {timeline.map((entry) => {
              const Icon = iconByType[entry.type] || Activity;
              return (
                <div key={entry.id} className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900">{entry.label}</p>
                    <p className="text-xs text-slate-500">{entry.at.toLocaleString('fr-MA')}</p>
                  </div>
                </div>
              );
            })}
            {!timeline.length ? <p className="text-sm text-slate-600">Aucun événement.</p> : null}
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

export default AdminLogsPage;
