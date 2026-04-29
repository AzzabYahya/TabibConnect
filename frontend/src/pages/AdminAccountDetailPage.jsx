import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bell, CalendarDays, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

function AdminAccountDetailPage() {
  const navigate = useNavigate();
  const { userId } = useParams();

  const detailQuery = useQuery({
    queryKey: ['admin-account-detail', userId],
    queryFn: async () => {
      const response = await api.get(`/dashboard/admin/accounts/${userId}`);
      return response.data?.data;
    },
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Card className="space-y-4 border-red-200 bg-red-50/70">
        <h1 className="text-xl font-bold text-red-900">Impossible de charger ce compte</h1>
        <Button onClick={() => navigate('/dashboard/admin')}>Retour admin</Button>
      </Card>
    );
  }

  const data = detailQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" className="gap-2" onClick={() => navigate('/dashboard/admin')}>
          <ArrowLeft size={16} /> Retour dashboard admin
        </Button>
        <Badge variant={data.account.isVerified ? 'success' : 'warning'}>
          {data.account.role}
        </Badge>
      </div>

      <Card className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">{data.account.email}</h1>
        <p className="text-sm text-slate-600">{data.account.phone || 'Telephone non renseigne'}</p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Stethoscope size={16} className="text-med-primary" /> Medecins consultes
          </p>
          {(data.consultedDoctors || []).map((entry) => (
            <div key={entry.appointmentId} className="rounded-2xl bg-slate-50/90 p-3 text-sm text-slate-700">
              <p className="font-semibold">{entry.doctorName}</p>
              <p>{entry.specialty}</p>
            </div>
          ))}
        </Card>

        <Card className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <UsersRound size={16} className="text-med-primary" /> Patients consultes
          </p>
          {(data.consultedPatients || []).map((entry) => (
            <div key={entry.appointmentId} className="rounded-2xl bg-slate-50/90 p-3 text-sm text-slate-700">
              <p className="font-semibold">{entry.patientName}</p>
              <p>{entry.reason}</p>
            </div>
          ))}
        </Card>
      </div>

      <Card className="space-y-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Bell size={16} className="text-med-primary" /> Notifications recentes
        </p>
        {(data.notifications || []).map((item) => (
          <div key={item.id} className="rounded-2xl bg-slate-50/90 p-3 text-sm text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant={item.isRead ? 'neutral' : 'info'}>{item.type}</Badge>
              <p className="inline-flex items-center gap-1 text-xs text-slate-500">
                <CalendarDays size={12} />
                {new Date(item.createdAt).toLocaleString('fr-MA')}
              </p>
            </div>
            <p className="mt-1">{item.message}</p>
          </div>
        ))}
      </Card>

      <Card className="space-y-2 bg-slate-50/90">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck size={16} className="text-med-primary" /> Profil associe
        </p>
        {data.account.patient ? <p className="text-sm text-slate-700">Patient: {data.account.patient.ville}</p> : null}
        {data.account.doctor ? <p className="text-sm text-slate-700">Medecin: {data.account.doctor.specialite}</p> : null}
      </Card>
    </div>
  );
}

export default AdminAccountDetailPage;
