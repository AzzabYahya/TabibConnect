import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

function DoctorStatsPage() {
  const query = useQuery({
    queryKey: ['doctor-stats'],
    queryFn: async () => {
      const response = await api.get('/doctors/me/stats');
      return response.data?.data;
    },
  });

  if (query.isLoading) {
    return <Skeleton className="h-80" />;
  }

  const stats = query.data || {};
  const series = stats.weekSeries || [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-2 bg-slate-50/90">
          <p className="text-sm text-slate-600">RDV du mois</p>
          <p className="text-3xl font-bold text-slate-900">{stats.thisMonthAppointments || 0}</p>
          <Badge variant="info">Évolution: {stats.evolutionVsPrevMonthPct || 0}%</Badge>
        </Card>
        <Card className="space-y-2 bg-slate-50/90">
          <p className="text-sm text-slate-600">Taux d’occupation</p>
          <p className="text-3xl font-bold text-slate-900">{stats.occupationRatePct || 0}%</p>
          <Badge variant="neutral">Estimé via créneaux actifs</Badge>
        </Card>
        <Card className="space-y-2 bg-slate-50/90">
          <p className="text-sm text-slate-600">Note moyenne</p>
          <p className="text-3xl font-bold text-slate-900">{stats.averageRating || 0}</p>
          <Badge variant="success">{stats.reviewsCount || 0} avis</Badge>
        </Card>
        <Card className="space-y-2 bg-slate-50/90">
          <p className="text-sm text-slate-600">RDV semaine</p>
          <p className="text-3xl font-bold text-slate-900">{series.reduce((sum, x) => sum + (x.count || 0), 0)}</p>
          <Badge variant="neutral">7 jours</Badge>
        </Card>
      </div>

      <Card className="h-80">
        <p className="mb-2 text-sm font-semibold text-slate-900">RDV par jour cette semaine</p>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#1A6B8A" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

export default DoctorStatsPage;
