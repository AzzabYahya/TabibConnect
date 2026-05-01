import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

function AdminNotificationsPage() {
  const [page, setPage] = useState(1);
  const [isRead, setIsRead] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const query = useQuery({
    queryKey: ['admin-notifications', page, isRead, search],
    queryFn: async () => {
      const response = await api.get('/admin/notifications', { params: { page, limit: 20, isRead, search } });
      return response.data?.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (ids) => api.post('/admin/notifications/mark-read', { ids }),
    onSuccess: async () => {
      toast.success('Notifications marquées comme lues.');
      setSelectedIds([]);
      await query.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Action impossible.'),
  });

  const items = query.data?.items || [];
  const pagination = query.data?.pagination;

  const toggle = (id) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  };

  const allIdsOnPage = useMemo(() => items.map((n) => n.id), [items]);
  const selectAllOnPage = () => setSelectedIds(allIdsOnPage);
  const clearSelection = () => setSelectedIds([]);

  return (
    <div className="space-y-4">
      <Card className="grid gap-2 md:grid-cols-3">
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Recherche (email ou message)..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rounded-xl border px-3 py-2 text-sm" value={isRead} onChange={(e) => setIsRead(e.target.value)}>
          <option value="ALL">Tous</option>
          <option value="UNREAD">Non lus</option>
          <option value="READ">Lus</option>
        </select>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={selectAllOnPage} disabled={!items.length}>Tout sélectionner</Button>
          <Button size="sm" variant="outline" onClick={clearSelection} disabled={!selectedIds.length}>Vider</Button>
          <Button size="sm" onClick={() => markReadMutation.mutate(selectedIds)} disabled={!selectedIds.length || markReadMutation.isPending}>
            Marquer comme lu
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        {query.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <label key={n.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <input type="checkbox" checked={selectedIds.includes(n.id)} onChange={() => toggle(n.id)} className="mt-1" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{n.type}</p>
                    {!n.isRead ? <span className="h-2 w-2 rounded-full bg-red-500" /> : null}
                    <p className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString('fr-MA')}</p>
                    <p className="text-xs text-slate-500">• {n.user?.email} ({n.user?.role})</p>
                  </div>
                  <p className="text-sm text-slate-700">{n.message}</p>
                </div>
              </label>
            ))}
            {!items.length ? <p className="text-sm text-slate-600">Aucune notification.</p> : null}
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

export default AdminNotificationsPage;
