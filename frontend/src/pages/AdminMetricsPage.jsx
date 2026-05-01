import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';

import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';

const palette = ['#1A6B8A', '#2ECC8F', '#F59E0B', '#EF4444', '#6366F1', '#EC4899'];

function AdminMetricsPage() {
  const query = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const response = await api.get('/admin/metrics');
      return response.data?.data;
    },
  });

  if (query.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
        <Skeleton className="h-80 lg:col-span-2" />
      </div>
    );
  }

  const metrics = query.data || {};
  const appointmentsByWeek = metrics.appointmentsByWeek || [];
  const specialtyDistribution = metrics.specialtyDistribution || [];
  const cityDistribution = metrics.cityDistribution || [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="h-80">
        <p className="mb-2 text-sm font-semibold text-slate-900">RDV par semaine (8 semaines)</p>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={appointmentsByWeek}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#1A6B8A" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="h-80">
        <p className="mb-2 text-sm font-semibold text-slate-900">Répartition par spécialité</p>
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie data={specialtyDistribution} dataKey="value" nameKey="name" outerRadius={90}>
              {specialtyDistribution.map((_, idx) => (
                <Cell key={idx} fill={palette[idx % palette.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="h-80 lg:col-span-2">
        <p className="mb-2 text-sm font-semibold text-slate-900">Répartition par ville</p>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={cityDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="city" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#2ECC8F" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

export default AdminMetricsPage;
