import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import api from '../lib/api';
import { dashboardRouteByRole, getCurrentSession } from '../lib/auth';
import DoctorAppointmentView from './appointment/DoctorAppointmentView';
import PatientAppointmentView from './appointment/PatientAppointmentView';

function AppointmentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { i18n } = useTranslation();
  const session = getCurrentSession();
  const role = session.role;

  const appointmentQuery = useQuery({
    queryKey: ['appointment-details', id],
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
    queryFn: async () => {
      const response = await api.get(`/appointments/${id}`);
      return response.data?.data;
    },
  });

  const ordonnanceQuery = useQuery({
    queryKey: ['appointment-ordonnance', id],
    enabled: Boolean(id) && Boolean(appointmentQuery.data),
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
    queryFn: async () => {
      const response = await api.get(`/appointments/${id}/ordonnance`);
      return response.data?.data ?? null;
    },
  });

  if (appointmentQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
        <Skeleton className="h-44" />
      </div>
    );
  }

  if (appointmentQuery.isError || !appointmentQuery.data) {
    const requiresLogin =
      appointmentQuery.error?.response?.status === 401 ||
      appointmentQuery.error?.response?.status === 403;
    const dashboardPath = role ? dashboardRouteByRole[role] : '/connexion';

    return (
      <Card className="space-y-4 border-red-200 bg-red-50/70">
        <div className="space-y-2">
          <Badge variant="warning">{requiresLogin ? 'Connexion requise' : 'Rendez-vous indisponible'}</Badge>
          <h1 className="text-2xl font-bold text-red-900">
            {requiresLogin
              ? 'Connectez-vous pour consulter ce rendez-vous'
              : 'Le détail du rendez-vous ne peut pas être chargé'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {requiresLogin ? (
            <Button onClick={() => navigate('/connexion')}>Aller à la connexion</Button>
          ) : null}
          <Button onClick={() => appointmentQuery.refetch()} variant="outline">
            Réessayer
          </Button>
          <Button onClick={() => navigate(dashboardPath || '/')}>Retour</Button>
        </div>
      </Card>
    );
  }

  const appointment = appointmentQuery.data
    ? {
        ...appointmentQuery.data,
        ordonnance: ordonnanceQuery.data ?? appointmentQuery.data.ordonnance ?? null,
      }
    : null;
  const onRefresh = async () => {
    await Promise.all([appointmentQuery.refetch(), ordonnanceQuery.refetch()]);
  };

  if (role === 'DOCTOR') {
    return (
      <DoctorAppointmentView
        appointment={appointment}
        onRefresh={onRefresh}
        language={i18n.language}
      />
    );
  }

  if (role === 'PATIENT') {
    return <PatientAppointmentView appointment={appointment} onRefresh={onRefresh} />;
  }

  return (
    <Card className="space-y-3">
      <p className="text-sm text-slate-600">
        Cette page est réservée aux comptes patient ou médecin connectés.
      </p>
      <Button onClick={() => navigate('/connexion')}>Se connecter</Button>
    </Card>
  );
}

export default AppointmentDetailPage;
