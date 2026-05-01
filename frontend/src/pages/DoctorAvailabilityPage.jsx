import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

const days = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];

function DoctorAvailabilityPage() {
  const [form, setForm] = useState({
    cabinetId: '',
    jourSemaine: 'LUNDI',
    heureDebut: '09:00',
    heureFin: '12:00',
    dureeConsultation: '30',
    isActive: true,
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    jourSemaine: 'LUNDI',
    heureDebut: '09:00',
    heureFin: '12:00',
    dureeConsultation: '30',
    isActive: true,
  });

  const managementQuery = useQuery({
    queryKey: ['doctor-profile-management'],
    queryFn: async () => {
      const response = await api.get('/doctors/me/profile-management');
      return response.data?.data;
    },
  });

  const cabinets = managementQuery.data?.cabinets || [];
  const availabilities = managementQuery.data?.availabilities || [];

  const createMutation = useMutation({
    mutationFn: async () => api.post('/doctors/me/availabilities', { ...form, cabinetId: form.cabinetId || cabinets[0]?.id }),
    onSuccess: async () => {
      toast.success('Créneau ajouté.');
      await managementQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Ajout impossible.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/doctors/me/availabilities/${id}`),
    onSuccess: async () => {
      toast.success('Créneau supprimé.');
      await managementQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Suppression impossible.'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => api.put(`/doctors/me/availabilities/${id}`, payload),
    onSuccess: async () => {
      toast.success('Créneau modifié.');
      setEditingId(null);
      await managementQuery.refetch();
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Modification impossible.'),
  });

  const grouped = useMemo(() => {
    const map = {};
    availabilities.forEach((a) => {
      map[a.jourSemaine] = map[a.jourSemaine] || [];
      map[a.jourSemaine].push(a);
    });
    days.forEach((d) => (map[d] = (map[d] || []).sort((x, y) => String(x.heureDebut).localeCompare(String(y.heureDebut)))));
    return map;
  }, [availabilities]);

  if (managementQuery.isLoading) {
    return <Skeleton className="h-80" />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Ajouter un créneau</p>
        <div className="grid gap-2 md:grid-cols-2">
          <select className="rounded-xl border px-3 py-2 text-sm" value={form.cabinetId || cabinets[0]?.id || ''} onChange={(e) => setForm((c) => ({ ...c, cabinetId: e.target.value }))}>
            {cabinets.map((c) => (
              <option key={c.id} value={c.id}>{c.name} • {c.city}</option>
            ))}
          </select>
          <select className="rounded-xl border px-3 py-2 text-sm" value={form.jourSemaine} onChange={(e) => setForm((c) => ({ ...c, jourSemaine: e.target.value }))}>
            {days.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="time" className="rounded-xl border px-3 py-2 text-sm" value={form.heureDebut} onChange={(e) => setForm((c) => ({ ...c, heureDebut: e.target.value }))} />
          <input type="time" className="rounded-xl border px-3 py-2 text-sm" value={form.heureFin} onChange={(e) => setForm((c) => ({ ...c, heureFin: e.target.value }))} />
          <select className="rounded-xl border px-3 py-2 text-sm" value={form.dureeConsultation} onChange={(e) => setForm((c) => ({ ...c, dureeConsultation: e.target.value }))}>
            {['15', '20', '30', '45'].map((v) => <option key={v} value={v}>{v} min</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
            Actif
          </label>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !cabinets.length}>
          Publier le créneau
        </Button>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Créneaux publiés</p>
        <div className="space-y-3">
          {days.map((d) => (
            <div key={d}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{d}</p>
              <div className="mt-2 space-y-2">
                {(grouped[d] || []).map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    {editingId === a.id ? (
                      <div className="grid w-full gap-2 md:grid-cols-6">
                        <select className="rounded-xl border px-2 py-2 text-xs" value={editForm.jourSemaine} onChange={(e) => setEditForm((c) => ({ ...c, jourSemaine: e.target.value }))}>
                          {days.map((day) => <option key={day} value={day}>{day}</option>)}
                        </select>
                        <input type="time" className="rounded-xl border px-2 py-2 text-xs" value={editForm.heureDebut} onChange={(e) => setEditForm((c) => ({ ...c, heureDebut: e.target.value }))} />
                        <input type="time" className="rounded-xl border px-2 py-2 text-xs" value={editForm.heureFin} onChange={(e) => setEditForm((c) => ({ ...c, heureFin: e.target.value }))} />
                        <select className="rounded-xl border px-2 py-2 text-xs" value={editForm.dureeConsultation} onChange={(e) => setEditForm((c) => ({ ...c, dureeConsultation: e.target.value }))}>
                          {['15', '20', '30', '45'].map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-xs text-slate-700">
                          <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((c) => ({ ...c, isActive: e.target.checked }))} />
                          Actif
                        </label>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateMutation.mutate({ id: a.id, payload: { ...editForm, dureeConsultation: Number(editForm.dureeConsultation) } })} disabled={updateMutation.isPending}>
                            Sauver
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge variant={a.isActive ? 'success' : 'neutral'}>{a.heureDebut} - {a.heureFin}</Badge>
                          <span>{a.dureeConsultation} min</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(a.id);
                              setEditForm({
                                jourSemaine: a.jourSemaine,
                                heureDebut: a.heureDebut,
                                heureFin: a.heureFin,
                                dureeConsultation: String(a.dureeConsultation),
                                isActive: Boolean(a.isActive),
                              });
                            }}
                          >
                            Modifier
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(a.id)} disabled={deleteMutation.isPending}>
                            Supprimer
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {!grouped[d]?.length ? <p className="text-sm text-slate-500">Aucun créneau.</p> : null}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default DoctorAvailabilityPage;
