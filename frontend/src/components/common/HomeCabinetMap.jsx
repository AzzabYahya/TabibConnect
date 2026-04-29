import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';

import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import api from '../../lib/api';
import { formatSpecialtyLabel } from '../../lib/frenchText';
import DoctorSearchMap from './DoctorSearchMap';

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function HomeCabinetMap() {
  const doctorsQuery = useQuery({
    queryKey: ['home-cabinet-map'],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await api.get('/doctors');
      const doctors = response.data?.data;

      return Array.isArray(doctors) ? doctors : [];
    },
  });

  const markerPoints = useMemo(() => {
    const cabinetsById = new Map();

    for (const doctor of doctorsQuery.data || []) {
      const doctorName = doctor.nomComplet || doctor.user?.email || 'Médecin';
      const specialtyLabel = formatSpecialtyLabel(doctor.specialite || 'Médecine générale');

      for (const entry of doctor.doctorCabinets || []) {
        const cabinet = entry.cabinet;
        const latitude = toSafeNumber(cabinet?.latitude);
        const longitude = toSafeNumber(cabinet?.longitude);

        if (!cabinet?.id || latitude === null || longitude === null) {
          continue;
        }

        const current = cabinetsById.get(cabinet.id) || {
          id: cabinet.id,
          cabinetName: cabinet.nom || cabinet.label || 'Cabinet médical',
          ville: cabinet.ville || 'Maroc',
          coords: [latitude, longitude],
          doctorNames: new Set(),
          specialties: new Set(),
        };

        current.doctorNames.add(doctorName);
        current.specialties.add(specialtyLabel);
        cabinetsById.set(cabinet.id, current);
      }
    }

    return Array.from(cabinetsById.values()).map(({ doctorNames, specialties, ...rest }) => ({
      ...rest,
      doctorNames: Array.from(doctorNames),
      specialties: Array.from(specialties),
    }));
  }, [doctorsQuery.data]);

  if (doctorsQuery.isLoading) {
    return <Skeleton className="h-[380px] rounded-[16px]" />;
  }

  if (doctorsQuery.isError) {
    return (
      <Card className="flex h-[380px] items-center justify-center border-red-200 bg-red-50/70 text-center">
        <div className="space-y-3">
          <div className="inline-flex rounded-full bg-red-100 p-3 text-red-600">
            <MapPin size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-900">Carte indisponible</h3>
            <p className="text-sm text-red-700">
              Les cabinets réels n'ont pas pu être chargés pour le moment.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!markerPoints.length) {
    return (
      <Card className="flex h-[380px] items-center justify-center border-slate-200 bg-slate-50 text-center">
        <div className="space-y-3">
          <div className="inline-flex rounded-full bg-med-primary/10 p-3 text-med-primary">
            <MapPin size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Aucun cabinet géolocalisé</h3>
            <p className="text-sm text-slate-600">
              Les médecins sont bien présents, mais aucun cabinet n'a encore de coordonnées exploitables.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return <DoctorSearchMap markerPoints={markerPoints} className="h-[380px]" />;
}

export default HomeCabinetMap;
