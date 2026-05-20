import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { CalendarDays, Mail, Phone, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';

import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import AdminDocumentViewer from '../components/admin/AdminDocumentViewer';


function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('ALL');
  const [city, setCity] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(null);
  const [notifyTarget, setNotifyTarget] = useState(null);
  const [notifyChannel, setNotifyChannel] = useState('both');
  const [notifySubject, setNotifySubject] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search, role, city, status, sortBy, sortDir]);

  const usersQuery = useQuery({
    queryKey: ['admin-users', page, search, role, city, status, sortBy, sortDir],
    queryFn: async () => {
      const response = await api.get('/admin/users', {
        params: {
          page,
          limit: 20,
          search,
          role,
          city,
          status,
          sortBy,
          sortDir,
        },
      });
      return response.data?.data;
    },
  });

  const users = usersQuery.data?.items || [];
  const pagination = usersQuery.data?.pagination;
  const selectedUserId = selected?.id || null;

  const selectedDetailQuery = useQuery({
    queryKey: ['admin-user-detail', selectedUserId],
    enabled: Boolean(selectedUserId),
    queryFn: async () => {
      const response = await api.get(`/dashboard/admin/accounts/${selectedUserId}`);
      return response.data?.data;
    },
  });

  const totalPages = pagination?.totalPages || 1;
  const pages = (() => {
    const current = pagination?.page || 1;
    const windowSize = 5;
    const start = Math.max(1, current - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const adjustedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
  })();

  const handleDisable = async (userId) => {
    try {
      setSubmitting(true);
      await api.post(`/admin/users/${userId}/disable`);
      toast.success('Compte désactivé.');
      await usersQuery.refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Désactivation impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifyTarget) return;
    if (!notifyMessage.trim()) {
      toast.error('Message obligatoire.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/dashboard/admin/accounts/${notifyTarget.id}/notify`, {
        channel: notifyChannel,
        subject: notifySubject,
        message: notifyMessage,
      });
      toast.success('Notification envoyée.');
      setNotifyMessage('');
      setNotifySubject('');
      setNotifyTarget(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Envoi impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="grid gap-2 md:grid-cols-6">
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Recherche..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rounded-xl border px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="ALL">Tous rôles</option><option value="ADMIN">Admin</option><option value="DOCTOR">Médecin</option><option value="PATIENT">Patient</option>
        </select>
        <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Ville..." value={city === 'ALL' ? '' : city} onChange={(e) => setCity(e.target.value || 'ALL')} />
        <select className="rounded-xl border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">Tous statuts</option><option value="ACTIVE">Actif</option><option value="INACTIVE">Inactif</option>
        </select>
        <select className="rounded-xl border px-3 py-2 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="createdAt">Tri: Date création</option>
          <option value="name">Tri: Nom</option>
          <option value="email">Tri: Email</option>
          <option value="role">Tri: Rôle</option>
          <option value="status">Tri: Statut</option>
        </select>
        <select className="rounded-xl border px-3 py-2 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
          <option value="desc">Ordre: Descendant</option>
          <option value="asc">Ordre: Ascendant</option>
        </select>
      </Card>

      <Card className="overflow-x-auto">
        {usersQuery.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <table className="tc-table min-w-[960px] text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Avatar</th>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Ville</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="py-2"><Avatar name={user.name} size="sm" /></td>
                  <td className="py-2">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.city || '-'}</td>
                  <td>{user.isVerified ? 'ACTIF' : 'INACTIF'}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString('fr-MA')}</td>
                  <td className="py-2">
                    <div className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setSelected(user)}>Voir fiche</Button>
                      <Button size="sm" variant="outline" onClick={() => setNotifyTarget(user)} disabled={submitting}>Envoyer notification</Button>
                      <Button size="sm" variant="outline" onClick={() => handleDisable(user.id)} disabled={submitting || !user.isVerified}>Désactiver</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={!pagination?.hasPrevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>←</Button>
        {pages[0] > 1 ? <span className="px-2 text-sm text-slate-500">…</span> : null}
        {pages.map((p) => (
          <Button key={p} size="sm" variant={p === (pagination?.page || 1) ? undefined : 'outline'} onClick={() => setPage(p)}>
            {p}
          </Button>
        ))}
        {pages[pages.length - 1] < totalPages ? <span className="px-2 text-sm text-slate-500">…</span> : null}
        <Button variant="outline" size="sm" disabled={!pagination?.hasNextPage} onClick={() => setPage((p) => p + 1)}>→</Button>
      </div>

      {selected ? (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-white p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Fiche utilisateur</h3>
            <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Fermer</Button>
          </div>
          {selectedDetailQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-16" />
              <Skeleton className="h-44" />
            </div>
          ) : null}
          {!selectedDetailQuery.isLoading && selectedDetailQuery.data ? (
            <div className="max-h-[84vh] space-y-3 overflow-auto pr-1">
              <Card className="space-y-2 bg-slate-50/90">
                <p className="text-base font-semibold text-slate-900">
                  {selectedDetailQuery.data.account?.doctor?.nomComplet || selectedDetailQuery.data.account?.email}
                </p>
                <p className="inline-flex items-center gap-2 text-sm text-slate-700"><Mail size={14} /> {selectedDetailQuery.data.account?.email}</p>
                <p className="inline-flex items-center gap-2 text-sm text-slate-700"><Phone size={14} /> {selectedDetailQuery.data.account?.phone || 'Non renseigné'}</p>
                <p className="inline-flex items-center gap-2 text-sm text-slate-700"><ShieldCheck size={14} /> {selectedDetailQuery.data.account?.role}</p>
                <p className="inline-flex items-center gap-2 text-sm text-slate-700"><CalendarDays size={14} /> Créé le {new Date(selectedDetailQuery.data.account?.createdAt).toLocaleDateString('fr-MA')}</p>
              </Card>

              {selectedDetailQuery.data.account?.doctor ? (
                <Card className="space-y-2 border-cyan-200 bg-cyan-50/70">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Stethoscope size={14} /> Profil médecin</p>
                  <p className="text-sm text-slate-700">Spécialité: {selectedDetailQuery.data.account.doctor.specialite || 'N/A'}</p>
                  <p className="text-sm text-slate-700">INPE: {selectedDetailQuery.data.account.doctor.inpe || 'N/A'}</p>
                  <p className="text-sm text-slate-700">Expérience: {selectedDetailQuery.data.account.doctor.experience ?? 'N/A'} ans</p>

                  <div className="mt-2">
                    <AdminDocumentViewer
                      endpoint={`/admin/users/${selectedDetailQuery.data.account.id}/cin`}
                      title="Carte Nationale (CIN)"
                    />
                  </div>
                </Card>
              ) : null}

              {selectedDetailQuery.data.account?.patient ? (
                <Card className="space-y-2 border-emerald-200 bg-emerald-50/70">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><UsersRound size={14} /> Profil patient</p>
                  <p className="text-sm text-slate-700">Ville: {selectedDetailQuery.data.account.patient.ville || 'N/A'}</p>
                  <p className="text-sm text-slate-700">CIN: {selectedDetailQuery.data.account.patient.cin || 'N/A'}</p>

                  <div className="mt-2">
                    <AdminDocumentViewer
                      endpoint={`/admin/users/${selectedDetailQuery.data.account.id}/cin`}
                      title="Carte Nationale (CIN)"
                    />
                  </div>
                </Card>
              ) : null}


              <Card className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">Derniers patients du médecin</p>
                {(selectedDetailQuery.data.consultedPatients || []).slice(0, 5).map((entry) => (
                  <button key={entry.appointmentId} type="button" onClick={() => setSelected({ id: entry.patientUserId || '' })} className="block w-full rounded-xl bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100">
                    <p className="font-medium text-slate-900">{entry.patientName}</p>
                    <p className="text-xs text-slate-600">{entry.reason || 'Motif non renseigné'}</p>
                  </button>
                ))}
              </Card>

              <Card className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">Derniers médecins visités</p>
                {(selectedDetailQuery.data.consultedDoctors || []).slice(0, 5).map((entry) => (
                  <button key={entry.appointmentId} type="button" onClick={() => setSelected({ id: entry.doctorUserId || '' })} className="block w-full rounded-xl bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100">
                    <p className="font-medium text-slate-900">{entry.doctorName}</p>
                    <p className="text-xs text-slate-600">{entry.specialty || 'Spécialité non renseignée'}</p>
                  </button>
                ))}
              </Card>

              <Card className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">Notifications récentes</p>
                {(selectedDetailQuery.data.notifications || []).slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-medium text-slate-900">{item.type}</p>
                    <p className="text-xs text-slate-600">{item.message}</p>
                  </div>
                ))}
              </Card>
            </div>
          ) : null}
        </aside>
      ) : null}

      <Modal isOpen={Boolean(notifyTarget)} title="Envoyer une notification" onClose={() => setNotifyTarget(null)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Destinataire: <span className="font-semibold">{notifyTarget?.email}</span>
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <select className="rounded-xl border px-3 py-2 text-sm" value={notifyChannel} onChange={(e) => setNotifyChannel(e.target.value)}>
              <option value="both">SMS + Email</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Sujet (email)" value={notifySubject} onChange={(e) => setNotifySubject(e.target.value)} />
          </div>
          <textarea className="w-full rounded-xl border px-3 py-2 text-sm" rows={4} placeholder="Message..." value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={handleSendNotification} disabled={submitting}>Envoyer</Button>
            <Button variant="outline" onClick={() => setNotifyTarget(null)}>Annuler</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AdminUsersPage;
