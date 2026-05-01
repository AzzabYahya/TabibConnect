import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

const MotionDiv = motion.div;

function AdminReviewsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const query = useQuery({
    queryKey: ['admin-reviews', page, status, search],
    queryFn: async () => {
      const response = await api.get('/admin/reviews', { params: { page, limit: 20, status, search } });
      return response.data?.data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (reviewId) => api.post(`/admin/reviews/${reviewId}/verify`),
    onSuccess: async () => {
      toast.success('Avis validé.');
      await query.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Validation impossible.'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ reviewId, reason }) => api.post(`/admin/reviews/${reviewId}/reject`, { reason }),
    onSuccess: async () => {
      toast.success('Avis rejeté (supprimé).');
      setRejecting(null);
      setRejectReason('');
      await query.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Rejet impossible.'),
  });

  const items = query.data?.items || [];
  const pagination = query.data?.pagination;

  return (
    <div className="space-y-4">
      <Card className="grid gap-2 md:grid-cols-3">
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Recherche (commentaire, email, médecin)..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rounded-xl border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PENDING">En attente</option>
          <option value="VERIFIED">Vérifiés</option>
        </select>
        <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Total: <span className="font-semibold">{pagination?.total ?? items.length}</span>
        </div>
      </Card>

      <div className="space-y-3">
        {query.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : (
          <AnimatePresence>
            {items.map((review) => (
              <MotionDiv
                key={review.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="space-y-3 bg-slate-50/90">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {review.doctor?.name} <span className="text-slate-500">({review.doctor?.specialty || 'N/A'})</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Patient: {review.patient?.name} • {new Date(review.createdAt).toLocaleString('fr-MA')}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">{review.comment || '—'}</p>
                    </div>
                    <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm">
                      Note: <span className="font-semibold">{review.rating}/5</span>
                    </div>
                  </div>
                  {status === 'PENDING' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => verifyMutation.mutate(review.id)} disabled={verifyMutation.isPending}>
                        Valider l’avis
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejecting(review)} disabled={rejectMutation.isPending}>
                        Rejeter l’avis
                      </Button>
                    </div>
                  ) : null}
                </Card>
              </MotionDiv>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={!pagination?.hasPrevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>←</Button>
        <span className="text-sm">{pagination?.page || 1} / {pagination?.totalPages || 1}</span>
        <Button variant="outline" size="sm" disabled={!pagination?.hasNextPage} onClick={() => setPage((p) => p + 1)}>→</Button>
      </div>

      <Modal
        isOpen={Boolean(rejecting)}
        title="Rejeter l’avis"
        onClose={() => {
          setRejecting(null);
          setRejectReason('');
        }}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Avis: <span className="font-semibold">{rejecting?.doctor?.name}</span> • Note {rejecting?.rating}/5
          </p>
          <textarea className="w-full rounded-xl border px-3 py-2 text-sm" rows={4} placeholder="Motif obligatoire..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="flex gap-2">
            <Button
              onClick={() => rejectMutation.mutate({ reviewId: rejecting.id, reason: rejectReason })}
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

export default AdminReviewsPage;
