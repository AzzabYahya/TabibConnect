import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

function AdminDoctorsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const query = useQuery({
    queryKey: ['admin-doctors', page, status, search],
    queryFn: async () => {
      const response = await api.get('/admin/doctors', { params: { page, limit: 20, status, search } });
      return response.data?.data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (doctorId) => api.post(`/admin/doctors/${doctorId}/verify`),
    onSuccess: async () => {
      toast.success('Médecin validé.');
      await query.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Validation impossible.'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ doctorId, reason }) => api.post(`/admin/doctors/${doctorId}/reject`, { reason }),
    onSuccess: async () => {
      toast.success('Médecin rejeté.');
      setRejecting(null);
      setRejectReason('');
      await query.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Rejet impossible.'),
  });

  const items = query.data?.items || [];
  const pagination = query.data?.pagination;
  const pendingCount = useMemo(() => items.filter((d) => !d.isVerified).length, [items]);

  return (
    <div className="space-y-4">
      <Card className="grid gap-2 md:grid-cols-3">
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Recherche (nom, email, INPE, spécialité)..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rounded-xl border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PENDING">En attente</option>
          <option value="VERIFIED">Vérifiés</option>
          <option value="ALL">Tous</option>
        </select>
        <div className="rounded-xl border bg-amber-50 px-3 py-2 text-sm text-amber-900">
          En attente sur cette page: <span className="font-semibold">{pendingCount}</span>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        {query.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Médecin</th>
                <th>INPE</th>
                <th>Spécialité</th>
                <th>Ville</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="py-2">
                    <p className="font-semibold text-slate-900">{doc.name}</p>
                    <p className="text-xs text-slate-500">{doc.email}</p>
                  </td>
                  <td>{doc.inpe}</td>
                  <td>{doc.specialty}</td>
                  <td>{doc.city || '-'}</td>
                  <td>{doc.isVerified ? 'VERIFIE' : 'EN_ATTENTE'}</td>
                  <td>{new Date(doc.createdAt).toLocaleDateString('fr-MA')}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => verifyMutation.mutate(doc.id)} disabled={verifyMutation.isPending || doc.isVerified}>
                        Valider
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejecting(doc)} disabled={rejectMutation.isPending}>
                        Rejeter
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={!pagination?.hasPrevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>←</Button>
        <span className="text-sm">{pagination?.page || 1} / {pagination?.totalPages || 1}</span>
        <Button variant="outline" size="sm" disabled={!pagination?.hasNextPage} onClick={() => setPage((p) => p + 1)}>→</Button>
      </div>

      <Modal
        isOpen={Boolean(rejecting)}
        title="Rejeter le médecin"
        onClose={() => {
          setRejecting(null);
          setRejectReason('');
        }}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Médecin: <span className="font-semibold">{rejecting?.name}</span>
          </p>
          <textarea className="w-full rounded-xl border px-3 py-2 text-sm" rows={4} placeholder="Motif obligatoire..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="flex gap-2">
            <Button
              onClick={() => rejectMutation.mutate({ doctorId: rejecting.id, reason: rejectReason })}
              disabled={rejectMutation.isPending || rejectReason.trim().length < 3}
            >
              Confirmer le rejet
            </Button>
            <Button variant="outline" onClick={() => setRejecting(null)}>Annuler</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AdminDoctorsPage;
