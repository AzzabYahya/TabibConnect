import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Filter,
  MapPinned,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  SlidersHorizontal,
  Video,
  X,
  Stethoscope,
  Clock,
} from 'lucide-react';

import Skeleton from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import api from '../lib/api';
import { getCurrentSession } from '../lib/auth';

const DoctorSearchMap = lazy(() => import('../components/common/DoctorSearchMap'));

const maxTarifLimit = 2000;
const resultsPerPage = 8;

const fallbackCityOptions = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès'];
const fallbackSpecialtyOptions = [
  'Médecine générale',
  'Cardiologie',
  'Dermatologie',
  'Gynécologie',
  'Neurologie',
  'Orthopédie',
  'Ophtalmologie',
  'ORL',
  'Pédiatrie',
  'Pneumologie',
];

const fallbackLanguageOptions = ['Français', 'Arabe', 'Darija', 'Anglais'];

const sortOptions = [
  { label: 'Pertinence', value: 'pertinence' },
  { label: 'Disponibilité', value: 'disponibilite' },
  { label: 'Tarif', value: 'tarif' },
  { label: 'Note', value: 'note' },
];

const createDefaultFilters = (searchParams) => ({
  query: searchParams.get('q') || '',
  ville: searchParams.get('ville') || '',
  specialite: searchParams.get('specialite') || '',
  disponibilite: 'TOUT',
  tarifMax: maxTarifLimit,
  sexe: 'TOUT',
  langues: [],
  assuranceOnly: false,
  videoOnly: false,
  noteMin: 0,
});

const getInitials = (name = '') =>
  String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'TC';

const inferTeleconsultation = (doctor) => {
  if (typeof doctor.bio === 'string' && /tele/i.test(doctor.bio)) return true;
  return Number(doctor.experience || 0) >= 8;
};

const resolveImageUrl = (value, doctor) => {
  if (!value) {
    // Return default avatar based on gender inference
    const text = `${doctor?.nomComplet || ''} ${doctor?.user?.email || ''}`.toLowerCase();
    if (/(salma|khadija|fatima|meryem|nadia|laila|sanae|mina|hajar)/.test(text)) {
      return '/assets/avatars/default_female.jpg';
    }
    return '/assets/avatars/default_male.png';
  }
  if (/^https?:\/\//i.test(value)) return value;
  const base = api.defaults.baseURL.endsWith('/') ? api.defaults.baseURL : `${api.defaults.baseURL}/`;
  const path = value.startsWith('/') ? value.slice(1) : value;
  try {
    return new URL(path, base).toString();
  } catch {
    return undefined;
  }
};

function SearchPage() {
  const navigate = useNavigate();
  const session = getCurrentSession();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => createDefaultFilters(searchParams));
  const [sortBy, setSortBy] = useState('pertinence');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [mapQuery, setMapQuery] = useState('');

  /** Reset all filters and sort back to defaults */
  const handleResetFilters = () => {
    setFilters(createDefaultFilters(new URLSearchParams()));
    setSortBy('pertinence');
    setCurrentPage(1);
  };

  /** Count how many filters are actively set (for the badge) */
  const defaultState = createDefaultFilters(new URLSearchParams());
  const activeFilterCount = [
    filters.query !== defaultState.query,
    filters.ville !== defaultState.ville,
    filters.specialite !== defaultState.specialite,
    filters.tarifMax < maxTarifLimit,
    filters.sexe !== 'TOUT',
    filters.langues.length > 0,
    filters.assuranceOnly,
    filters.videoOnly,
    filters.noteMin > 0,
  ].filter(Boolean).length;

  const citiesQuery = useQuery({
    queryKey: ['home-cities'],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await api.get('/home/summary');
      return response.data?.data || {};
    },
  });

  const cityOptions = useMemo(() => {
    const cities = Array.isArray(citiesQuery.data?.cities) ? citiesQuery.data.cities : [];
    return cities.length ? cities : fallbackCityOptions;
  }, [citiesQuery.data]);

  const filtersQuery = useQuery({
    queryKey: ['search-filters'],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await api.get('/search/filters');
      return response.data?.data || {};
    },
  });

  const specialtyOptions = useMemo(() => {
    const specialties = Array.isArray(filtersQuery.data?.specialites)
      ? filtersQuery.data.specialites
      : [];
    return specialties.length ? specialties : fallbackSpecialtyOptions;
  }, [filtersQuery.data]);

  const languageOptions = useMemo(() => {
    const languages = Array.isArray(filtersQuery.data?.langues)
      ? filtersQuery.data.langues
      : [];
    const values = languages.length ? languages : fallbackLanguageOptions;
    return values.map((value) => ({ label: value, value }));
  }, [filtersQuery.data]);

  const normalizeDoctorList = (payload) => {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.results)) {
      return payload.results;
    }

    if (Array.isArray(payload?.items)) {
      return payload.items;
    }

    return [];
  };

  const query = filters.query.trim();

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: resultsPerPage,
          q: query || undefined,
          ville: filters.ville || undefined,
          specialite: filters.specialite || undefined,
          maxTarif: filters.tarifMax < maxTarifLimit ? filters.tarifMax : undefined,
          accepteAssurance: filters.assuranceOnly || undefined,
          minNote: filters.noteMin > 0 ? filters.noteMin : undefined,
          videoOnly: filters.videoOnly || undefined,
          sexe: filters.sexe !== 'TOUT' ? filters.sexe : undefined,
          langues: filters.langues.length ? filters.langues.join(',') : undefined,
        };


        const response = await api.get('/doctors', { params });

        const data = response.data?.data;
        setDoctors(normalizeDoctorList(data));
        if (data?.pagination) {
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [
    filters.query,
    filters.ville,
    filters.specialite,
    filters.tarifMax,
    filters.sexe,
    filters.langues,
    filters.assuranceOnly,
    filters.videoOnly,
    filters.noteMin,
    currentPage
  ]);


  const handleBooking = (doctor) => {
    navigate(`/doctor/${doctor.id}`);
  };

  const sortedDoctors = useMemo(() => {
    const result = Array.isArray(doctors) ? [...doctors] : [];

    if (sortBy === 'tarif') {
      result.sort((a, b) => Number(a.tarifConsultation || 0) - Number(b.tarifConsultation || 0));
    } else if (sortBy === 'note') {
      const getRating = (doctor) => Number(doctor.ratingAverage ?? doctor.rating?.average ?? 0);
      result.sort((a, b) => getRating(b) - getRating(a));
    }

    return result;
  }, [doctors, sortBy]);

  // Build map marker points from doctor cabinet GPS data
  const markerPoints = useMemo(() => {
    const cabinetsById = new Map();

    sortedDoctors.forEach((doctor) => {
      const cabinets = doctor.doctorCabinets || [];
      const doctorName = doctor.nomComplet || 'Dr.';
      const specialtyLabel = doctor.specialite || '';
      const tarifLabel = doctor.tarifConsultation
        ? `${Number(doctor.tarifConsultation).toLocaleString('fr-FR')} MAD`
        : 'Tarif non renseigné';

      cabinets.forEach((dc) => {
        const cab = dc.cabinet;
        if (!cab || cab.latitude == null || cab.longitude == null) return;
        const lat = Number(cab.latitude);
        const lng = Number(cab.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const cabinetKey = cab.id;
        const current = cabinetsById.get(cabinetKey) || {
          coords: [lat, lng],
          cabinetName: cab.nom || '',
          ville: cab.ville || '',
          cabinetId: cabinetKey,
          doctorsMap: new Map(),
        };

        current.doctorsMap.set(doctor.id, {
          id: doctor.id,
          name: doctorName,
          specialty: specialtyLabel,
          tarifLabel,
        });

        cabinetsById.set(cabinetKey, current);
      });
    });

    return Array.from(cabinetsById.values()).map(({ doctorsMap, ...rest }) => {
      const doctorsList = Array.from(doctorsMap.values());
      return {
        ...rest,
        doctors: doctorsList,
        doctorName: doctorsList.length === 1 ? doctorsList[0].name : undefined,
        specialty: doctorsList.length === 1 ? doctorsList[0].specialty : undefined,
        tarifLabel: doctorsList.length === 1 ? doctorsList[0].tarifLabel : undefined,
        doctorId: doctorsList.length === 1 ? doctorsList[0].id : undefined,
        profileHref: doctorsList.length === 1 ? `/doctor/${doctorsList[0].id}` : undefined,
      };
    });
  }, [sortedDoctors]);

  const normalizedMapQuery = mapQuery.trim().toLowerCase();
  const filteredMarkerPoints = useMemo(() => {
    if (!normalizedMapQuery) {
      return markerPoints;
    }

    return markerPoints.filter((marker) => {
      const fields = [marker.cabinetName, marker.ville];
      
      if (Array.isArray(marker.doctors)) {
        marker.doctors.forEach((doc) => {
          fields.push(doc.name, doc.specialty);
        });
      }

      return fields
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedMapQuery));
    });
  }, [markerPoints, normalizedMapQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-slate-200/60 bg-gradient-to-r from-[#1A6B8A] via-[#1a7b8a] to-[#2ECC8F]">
        <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%2215%22%20cy%3D%2215%22%20r%3D%221%22%20fill%3D%22rgba(255%2C255%2C255%2C0.07)%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-[#2ECC8F]/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-8">
          <div className="flex items-center gap-3 text-white/80">
            <Stethoscope size={20} />
            <span className="text-sm font-medium tracking-wide uppercase">Recherche médicale</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Trouvez votre médecin
          </h1>
          <p className="mt-2 max-w-lg text-sm text-white/70">
            Recherchez par nom, prénom, spécialité ou symptôme parmi notre réseau de professionnels de santé qualifiés
          </p>

          {/* Search Bar */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/20 bg-white/95 px-4 py-3.5 shadow-lg shadow-black/10 backdrop-blur-sm transition-all focus-within:border-white/40 focus-within:shadow-xl">
              <Search size={20} className="text-[#1A6B8A]" />
              <input
                type="text"
                placeholder="Nom, prénom, spécialité ou symptôme..."
                value={filters.query}
                onChange={(e) => {
                  setFilters((current) => ({ ...current, query: e.target.value }));
                  setCurrentPage(1);
                }}
                className="flex-1 border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              {filters.query && (
                <button
                  onClick={() => {
                    setFilters((current) => ({ ...current, query: '' }));
                    setCurrentPage(1);
                  }}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <select
              value={filters.specialite}
              onChange={(e) => {
                setFilters((current) => ({ ...current, specialite: e.target.value }));
                setCurrentPage(1);
              }}
              className="rounded-2xl border border-white/20 bg-white/95 px-4 py-3.5 text-sm text-slate-700 shadow-lg shadow-black/10 backdrop-blur-sm transition-all hover:border-white/40"
            >
              <option value="">Toutes spécialités</option>
              {specialtyOptions.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
            <select
              value={filters.ville}
              onChange={(e) => {
                setFilters((current) => ({ ...current, ville: e.target.value }));
                setCurrentPage(1);
              }}
              className="rounded-2xl border border-white/20 bg-white/95 px-4 py-3.5 text-sm text-slate-700 shadow-lg shadow-black/10 backdrop-blur-sm transition-all hover:border-white/40"
            >
              <option value="">Toutes villes</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Filters Sidebar */}
          <div className={`${showFiltersModal ? 'fixed inset-0 z-50 flex items-start justify-end bg-black/50 p-4 sm:p-0' : 'hidden h-fit lg:block'} lg:w-64`}>
            <div className={`${showFiltersModal ? 'w-full max-w-sm rounded-2xl' : ''} space-y-5 rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm`}>
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-wide">
                  <SlidersHorizontal size={15} className="text-[#1A6B8A]" /> Filtres
                </h3>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={handleResetFilters}
                      className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 hover:text-red-700"
                      title="Réinitialiser tous les filtres"
                    >
                      <RotateCcw size={12} />
                      Réinitialiser
                    </button>
                  )}
                  {showFiltersModal && (
                    <button
                      onClick={() => setShowFiltersModal(false)}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Section 1: Budget limit */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tarif maximum</h4>
                  <span className="text-xs font-semibold text-[#1A6B8A] bg-[#1A6B8A]/5 px-2 py-0.5 rounded-lg">
                    {Number(filters.tarifMax).toLocaleString('fr-FR')} MAD
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max={maxTarifLimit}
                  step="50"
                  value={filters.tarifMax}
                  onChange={(e) => setFilters((current) => ({ ...current, tarifMax: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1A6B8A] transition-all hover:bg-slate-200"
                />
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100/80 my-2" />

              {/* Section 2: Gender Selector */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sexe du médecin</h4>
                <div className="flex p-1 bg-slate-50/80 rounded-2xl border border-slate-200/40">
                  {['TOUT', 'HOMME', 'FEMME'].map((value) => {
                    const isSelected = filters.sexe === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilters((current) => ({ ...current, sexe: value }))}
                        className={`flex-1 text-center py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#1A6B8A] text-white shadow-sm shadow-[#1A6B8A]/20 scale-[1.02]'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {value === 'TOUT' ? 'Tous' : value === 'HOMME' ? 'Homme' : 'Femme'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100/80 my-2" />

              {/* Section 3: Dynamic Language Selection with Beautiful Badges */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Langues parlées</h4>
                <div className="flex flex-wrap gap-2">
                  {languageOptions.map((option) => {
                    const isSelected = filters.langues.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFilters((current) => ({
                            ...current,
                            langues: isSelected
                              ? current.langues.filter((v) => v !== option.value)
                              : [...current.langues, option.value],
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#1A6B8A]/10 text-[#1A6B8A] border-[#1A6B8A]/35 shadow-sm shadow-[#1A6B8A]/5'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800'
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#1A6B8A] animate-pulse" />}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100/80 my-2" />

              {/* Section 4: Separate Services & Options with iOS switches */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Services & Options</h4>
                
                {/* Switch: Assurance */}
                <div className="flex items-center justify-between py-1 group cursor-pointer" onClick={() => setFilters((current) => ({ ...current, assuranceOnly: !current.assuranceOnly }))}>
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                    Accepte mon assurance
                  </span>
                  <button
                    type="button"
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      filters.assuranceOnly ? 'bg-[#1A6B8A]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        filters.assuranceOnly ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch: Teleconsultation */}
                <div className="flex items-center justify-between py-1 group cursor-pointer" onClick={() => setFilters((current) => ({ ...current, videoOnly: !current.videoOnly }))}>
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                    Disponible en vidéo
                  </span>
                  <button
                    type="button"
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      filters.videoOnly ? 'bg-[#1A6B8A]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        filters.videoOnly ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100/80 my-2" />

              {/* Section 5: Note minimale */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Note minimale</h4>
                <div className="flex items-center gap-1.5 py-1">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((value) => {
                    const isFilled = Number(filters.noteMin) >= value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setFilters((current) => ({
                            ...current,
                            noteMin: current.noteMin === value ? 0 : value,
                          }))
                        }
                        className={`text-2xl transition-all duration-150 transform hover:scale-125 ${
                          isFilled ? 'text-amber-400 drop-shadow-sm scale-110' : 'text-slate-200 hover:text-amber-200'
                        }`}
                      >
                        ★
                      </button>
                    );
                  })}
                  {filters.noteMin > 0 && (
                    <span className="text-xs font-bold text-slate-400 ml-2 animate-fadeIn">
                      {filters.noteMin}+
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {pagination.total} <span className="text-[#1A6B8A]">médecin{pagination.total > 1 ? 's' : ''}</span> trouvé{pagination.total > 1 ? 's' : ''}
                </h2>
                {query && (
                  <p className="mt-1 text-sm text-slate-500">
                    Résultats pour « <span className="font-medium text-slate-700">{query}</span> »
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowFiltersModal(true)}
                  className="gap-2 lg:hidden"
                >
                  <Filter size={16} /> Filtres
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="gap-2"
                  disabled={activeFilterCount === 0}
                >
                  <RotateCcw size={14} />
                  Réinitialiser
                  {activeFilterCount > 0 && (
                    <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1A6B8A] text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-all hover:border-slate-300"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      Trier: {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results */}
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200/60 bg-white p-4">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="mt-3 h-5 w-3/4" />
                    <Skeleton className="mt-2 h-4 w-1/2" />
                    <Skeleton className="mt-4 h-9" />
                  </div>
                ))}
              </div>
            ) : sortedDoctors.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 px-6 py-16 text-center shadow-sm">
                <div className="rounded-2xl bg-amber-100/80 p-4">
                  <Sparkles className="h-8 w-8 text-amber-600" />
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-900">Aucun médecin trouvé</p>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Essayez de modifier vos critères de recherche ou réduisez les filtres appliqués
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {sortedDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-300 hover:border-[#1A6B8A]/20 hover:shadow-lg hover:shadow-[#1A6B8A]/5 hover:-translate-y-0.5"
                  >
                    {/* Photo section */}
                    <div className="relative flex items-center justify-center bg-gradient-to-br from-slate-50 to-cyan-50/50 px-4 py-6">
                      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#1A6B8A]/10 to-transparent" />
                      <Avatar
                        name={doctor.nomComplet}
                        src={resolveImageUrl(doctor.profilePhotoUrl, doctor)}
                        size="xl"
                      />
                      {/* Rating badge */}
                      <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-slate-700">
                          {Number(doctor.ratingAverage || doctor.rating?.average || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Info section */}
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="font-bold text-slate-900 leading-snug line-clamp-1 group-hover:text-[#1A6B8A] transition-colors">
                        {doctor.nomComplet || 'Dr.'}
                      </h3>
                      <p className="mt-1 text-xs font-medium text-[#1A6B8A]/80">{doctor.specialite}</p>

                      {/* Tags */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {doctor.accepteAssurance && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
                            <ShieldCheck size={10} /> Assurance
                          </span>
                        )}
                        {inferTeleconsultation(doctor) && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200/60">
                            <Video size={10} /> Vidéo
                          </span>
                        )}
                        {doctor.experience > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200/60">
                            <Clock size={10} /> {doctor.experience} ans
                          </span>
                        )}
                      </div>

                      {/* Price + CTA */}
                      <div className="mt-auto pt-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-slate-400">Consultation</p>
                            <p className="text-lg font-extrabold text-slate-900">
                              {Number(doctor.tarifConsultation || 0).toLocaleString('fr-FR')}
                              <span className="ml-1 text-xs font-medium text-slate-500">MAD</span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleBooking(doctor)}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1A6B8A] to-[#1a7b8a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:from-[#15586f] hover:to-[#166b73] active:scale-[0.98]"
                        >
                          Prendre RDV <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1 || loading}
                  onClick={() => {
                    setCurrentPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="rounded-xl px-6"
                >
                  Précédent
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">
                    Page <span className="text-[#1A6B8A]">{currentPage}</span> sur {pagination.pages}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === pagination.pages || loading}
                  onClick={() => {
                    setCurrentPage(p => Math.min(pagination.pages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="rounded-xl px-6"
                >
                  Suivant
                </Button>
              </div>
            )}

            {/* Map Section */}
            {!loading && sortedDoctors.length > 0 && (
              <div className="mt-10">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <MapPinned size={18} className="text-[#1A6B8A]" />
                    <h3 className="text-lg font-bold text-slate-900">Localisation des médecins</h3>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-sm shadow-sm">
                    <Search size={16} className="text-[#1A6B8A]" />
                    <input
                      type="text"
                      value={mapQuery}
                      onChange={(event) => setMapQuery(event.target.value)}
                      className="w-[200px] bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                      placeholder="Rechercher sur la carte..."
                    />
                    {mapQuery ? (
                      <button
                        type="button"
                        onClick={() => setMapQuery('')}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Effacer la recherche"
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
                <Suspense
                  fallback={
                    <div className="flex h-[400px] items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-50">
                      <div className="text-center">
                        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#1A6B8A] border-t-transparent" />
                        <p className="text-sm text-slate-500">Chargement de la carte…</p>
                      </div>
                    </div>
                  }
                >
                  <DoctorSearchMap
                    markerPoints={filteredMarkerPoints}
                    className="h-[400px]"
                    onMarkerProfileClick={(marker) => {
                      if (marker?.doctorId) {
                        handleBooking({ id: marker.doctorId });
                      }
                    }}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

export default SearchPage;
