import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const doctorsQuery = useQuery({
    queryKey: ['home-cabinet-map'],
    staleTime: 0,
    retry: 1,
    queryFn: async () => {
      const fetchPage = async (page) => {
        const response = await api.get('/doctors', { params: { limit: 200, page } });
        const payload = response.data?.data;
        if (payload && Array.isArray(payload.items)) {
          return { items: payload.items, pagination: payload.pagination };
        }
        return { items: Array.isArray(payload) ? payload : [], pagination: { pages: 1 } };
      };

      const firstPage = await fetchPage(1);
      const totalPages = Number(firstPage.pagination?.pages || 1);

      if (totalPages <= 1) {
        return firstPage.items;
      }

      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2))
      );

      return [
        ...firstPage.items,
        ...remainingPages.flatMap((page) => page.items),
      ];
    },
  });

  const markerPoints = useMemo(() => {
    const cabinetsById = new Map();

    for (const doctor of doctorsQuery.data || []) {
      const doctorName = doctor.nomComplet || doctor.user?.email || 'Médecin';
      const specialtyLabel = formatSpecialtyLabel(doctor.specialite || 'Médecine générale');
      const tarifLabel = doctor.tarifConsultation
        ? `${Number(doctor.tarifConsultation).toLocaleString('fr-FR')} MAD`
        : 'Tarif non renseigné';

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
          doctorsMap: new Map(),
        };

        current.doctorsMap.set(doctor.id, {
          id: doctor.id,
          name: doctorName,
          specialty: specialtyLabel,
          tarifLabel,
        });

        cabinetsById.set(cabinet.id, current);
      }
    }

    return Array.from(cabinetsById.values()).map(({ doctorsMap, ...rest }) => {
      const doctorsList = Array.from(doctorsMap.values());
      return {
        ...rest,
        doctors: doctorsList,
        doctorId: doctorsList.length === 1 ? doctorsList[0].id : undefined,
        profileHref: doctorsList.length === 1 ? `/doctor/${doctorsList[0].id}` : undefined,
      };
    });
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

  return (
    <DoctorSearchMap
      mapKey="home-cabinet-map"
      markerPoints={markerPoints}
      className="h-[380px]"
      onMarkerProfileClick={(marker) => {
        if (!marker?.doctorId) {
          return;
        }
        navigate(`/doctor/${marker.doctorId}`);
      }}
    />
  );
}

export default HomeCabinetMap;
