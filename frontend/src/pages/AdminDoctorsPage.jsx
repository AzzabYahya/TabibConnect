import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

import AdminDocumentViewer from '../components/admin/AdminDocumentViewer';

function AdminDoctorsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingRef = useRef(null);
  const verifiedRef = useRef(null);

  const [pendingPage, setPendingPage] = useState(1);
  const [verifiedPage, setVerifiedPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewingCin, setViewingCin] = useState(null);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'PENDING' && pendingRef.current) {
      pendingRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (status === 'VERIFIED' && verifiedRef.current) {
      verifiedRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searchParams]);

  useEffect(() => {
    setPendingPage(1);
    setVerifiedPage(1);
  }, [search, sortBy, sortDir]);


  const pendingQuery = useQuery({
    queryKey: ['admin-doctors-pending', pendingPage, search, sortBy, sortDir],
    queryFn: async () => {
      const response = await api.get('/admin/doctors', {
        params: {
          page: pendingPage,
          limit: 20,
          status: 'PENDING',
          search,
          sortBy,
          sortDir,
        },
      });
      return response.data?.data;
    },
  });

  const verifiedQuery = useQuery({
    queryKey: ['admin-doctors-verified', verifiedPage, search, sortBy, sortDir],
    queryFn: async () => {
      const response = await api.get('/admin/doctors', {
        params: {
          page: verifiedPage,
          limit: 20,
          status: 'VERIFIED',
          search,
          sortBy,
          sortDir,
        },
      });
      return response.data?.data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (doctorId) => api.post(`/admin/doctors/${doctorId}/verify`),
    onSuccess: async () => {
      toast.success('Médecin validé.');
      await pendingQuery.refetch();
      await verifiedQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Validation impossible.'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ doctorId, reason }) => api.post(`/admin/doctors/${doctorId}/reject`, { reason }),
    onSuccess: async () => {
      toast.success('Médecin rejeté.');
      setRejecting(null);
      setRejectReason('');
      await pendingQuery.refetch();
      await verifiedQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Rejet impossible.'),
  });

  const pendingItems = pendingQuery.data?.items || [];
  const pendingPagination = pendingQuery.data?.pagination;
  const verifiedItems = verifiedQuery.data?.items || [];
  const verifiedPagination = verifiedQuery.data?.pagination;

  return (
    <div className="space-y-4">
      <Card className="grid gap-2 md:grid-cols-3">
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Recherche (nom, email, INPE, spécialité)..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rounded-xl border px-3 py-2 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="createdAt">Tri: Date création</option>
          <option value="name">Tri: Nom</option>
          <option value="email">Tri: Email</option>
        </select>
        <select className="rounded-xl border px-3 py-2 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
          <option value="desc">Ordre: Descendant</option>
          <option value="asc">Ordre: Ascendant</option>
        </select>
      </Card>

      <Card ref={pendingRef} className="space-y-3 overflow-x-auto">
        <p className="px-1 text-sm font-semibold text-slate-900">Médecins en attente</p>

        {pendingQuery.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={`pending-${i}`} className="h-10" />)}</div>
        ) : (
          <table className="tc-table min-w-[960px] text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Médecin</th>
                <th>INPE</th>
                <th>Spécialité</th>
                <th>Ville</th>
                <th>Photo profil</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingItems.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="py-2">
                    <button type="button" className="text-left" onClick={() => navigate(`/dashboard/admin/accounts/${doc.userId}`)}>
                      <p className="font-semibold text-slate-900 hover:underline">{doc.name}</p>
                      <p className="text-xs text-slate-500">{doc.email}</p>
                    </button>
                  </td>
                  <td>{doc.inpe}</td>
                  <td>{doc.specialty}</td>
                  <td>{doc.city || '-'}</td>
                  <td>{doc.documents?.some((item) => String(item.mimeType || '').startsWith('image/')) ? 'OK' : 'MANQUANTE'}</td>
                  <td>{new Date(doc.createdAt).toLocaleDateString('fr-MA')}</td>
                  <td className="py-2">
                    <div className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Button size="sm" onClick={() => verifyMutation.mutate(doc.id)} disabled={verifyMutation.isPending}>
                        Valider
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejecting(doc)} disabled={rejectMutation.isPending}>
                        Rejeter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingCin(doc)}
                      >
                        Voir CIN
                      </Button>
                    </div>
                  </td>

                </tr>
              ))}
              {!pendingItems.length ? (
                <tr>
                  <td colSpan={7} className="py-3 text-sm text-slate-600">
                    Aucun médecin en attente.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!pendingPagination?.hasPrevPage} onClick={() => setPendingPage((p) => Math.max(1, p - 1))}>←</Button>
          <span className="text-sm">{pendingPagination?.page || 1} / {pendingPagination?.totalPages || 1}</span>
          <Button variant="outline" size="sm" disabled={!pendingPagination?.hasNextPage} onClick={() => setPendingPage((p) => p + 1)}>→</Button>
        </div>
      </Card>

      <Card ref={verifiedRef} className="space-y-3 overflow-x-auto">
        <p className="px-1 text-sm font-semibold text-slate-900">Médecins vérifiés</p>

        {verifiedQuery.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={`verified-${i}`} className="h-10" />)}</div>
        ) : (
          <table className="tc-table min-w-[960px] text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Médecin</th>
                <th>INPE</th>
                <th>Spécialité</th>
                <th>Ville</th>
                <th>Photo profil</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {verifiedItems.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="py-2">
                    <button type="button" className="text-left" onClick={() => navigate(`/dashboard/admin/accounts/${doc.userId}`)}>
                      <p className="font-semibold text-slate-900 hover:underline">{doc.name}</p>
                      <p className="text-xs text-slate-500">{doc.email}</p>
                    </button>
                  </td>
                  <td>{doc.inpe}</td>
                  <td>{doc.specialty}</td>
                  <td>{doc.city || '-'}</td>
                  <td>{doc.documents?.some((item) => String(item.mimeType || '').startsWith('image/')) ? 'OK' : 'MANQUANTE'}</td>
                  <td>{new Date(doc.createdAt).toLocaleDateString('fr-MA')}</td>
                  <td className="py-2">
                    <div className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setRejecting(doc)} disabled={rejectMutation.isPending}>
                        Rejeter
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!verifiedItems.length ? (
                <tr>
                  <td colSpan={7} className="py-3 text-sm text-slate-600">
                    Aucun médecin vérifié.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!verifiedPagination?.hasPrevPage} onClick={() => setVerifiedPage((p) => Math.max(1, p - 1))}>←</Button>
          <span className="text-sm">{verifiedPagination?.page || 1} / {verifiedPagination?.totalPages || 1}</span>
          <Button variant="outline" size="sm" disabled={!verifiedPagination?.hasNextPage} onClick={() => setVerifiedPage((p) => p + 1)}>→</Button>
        </div>
      </Card>

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

      <Modal
        isOpen={Boolean(viewingCin)}
        title="Vérification de la CIN"
        onClose={() => setViewingCin(null)}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="h-10 w-10 rounded-full bg-med-primary/10 flex items-center justify-center text-med-primary">
              <span className="font-bold text-lg">{viewingCin?.name?.[0]}</span>
            </div>
            <div>
              <p className="font-bold text-slate-900">{viewingCin?.name}</p>
              <p className="text-xs text-slate-500">{viewingCin?.email}</p>
            </div>
          </div>

          <AdminDocumentViewer
            endpoint={`/admin/users/${viewingCin?.userId}/cin`}
            title="Carte Nationale d'Identité"
          />

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewingCin(null)}>Fermer</Button>
          </div>
        </div>
      </Modal>
    </div>

  );
}

export default AdminDoctorsPage;
