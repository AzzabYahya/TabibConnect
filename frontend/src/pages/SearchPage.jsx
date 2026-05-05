import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Filter,
  MapPinned,
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

import AccessPromptModal from '../components/common/AccessPromptModal';
import Skeleton from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import api from '../lib/api';
import { getCurrentSession } from '../lib/auth';

const DoctorSearchMap = lazy(() => import('../components/common/DoctorSearchMap'));

const maxTarifLimit = 2000;
const resultsPerPage = 8;

const specialtyOptions = [
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

const cityOptions = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès'];

const languageOptions = [
  { label: 'Arabe', value: 'ARABE' },
  { label: 'Français', value: 'FRANCAIS' },
  { label: 'Amazigh', value: 'AMAZIGH' },
];

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

const normalizeDoctorLanguage = (value = '') => {
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('amazigh') || normalized.includes('tamazight')) return 'AMAZIGH';
  if (normalized.includes('fran') || normalized.includes('french')) return 'FRANCAIS';
  if (normalized.includes('darija') || normalized.includes('arabe')) return 'ARABE';
  return normalized.toUpperCase();
};

const getInitials = (name = '') =>
  String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'TC';

const inferGender = (doctor) => {
  const text = `${doctor.nomComplet || ''} ${doctor.user?.email || ''}`.toLowerCase();
  if (/(salma|khadija|fatima|meryem|nadia)/.test(text)) return 'FEMME';
  if (/(amine|youssef|omar|hamza|karim)/.test(text)) return 'HOMME';
  return 'TOUT';
};

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
  const [showAccessModal, setShowAccessModal] = useState(false);

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

  // Fetch doctors
  const query = filters.query.trim();
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: resultsPerPage,
        };

        let response;
        if (query.length >= 2) {
          response = await api.get('/doctors/search', { params: { q: query, ...params } });
        } else {
          response = await api.get('/doctors', { params });
        }
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
  }, [query, currentPage]);

  const handleBooking = (doctor) => {
    if (!session?.user) {
      setShowAccessModal(true);
      return;
    }
    navigate(`/doctor/${doctor.id}`);
  };

  const filteredDoctors = useMemo(() => {
    let result = Array.isArray(doctors) ? [...doctors] : [];

    if (filters.tarifMax < maxTarifLimit) {
      result = result.filter((doc) => Number(doc.tarifConsultation || 0) <= filters.tarifMax);
    }

    if (filters.sexe !== 'TOUT') {
      result = result.filter((doc) => inferGender(doc) === filters.sexe);
    }

    if (filters.langues.length > 0) {
      result = result.filter((doc) => {
        const langs = (Array.isArray(doc.languesParlees) ? doc.languesParlees : []).map(normalizeDoctorLanguage);
        return filters.langues.some((lang) => langs.includes(lang));
      });
    }

    if (filters.assuranceOnly) {
      result = result.filter((doc) => Boolean(doc.accepteAssurance));
    }

    if (filters.videoOnly) {
      result = result.filter((doc) => inferTeleconsultation(doc));
    }

    if (filters.noteMin > 0) {
      result = result.filter((doc) => Number(doc.ratingAverage || 0) >= filters.noteMin);
    }

    if (sortBy === 'tarif') {
      result.sort((a, b) => Number(a.tarifConsultation || 0) - Number(b.tarifConsultation || 0));
    } else if (sortBy === 'note') {
      result.sort((a, b) => Number(b.ratingAverage || 0) - Number(a.ratingAverage || 0));
    }

    return result;
  }, [doctors, filters, sortBy]);

  // Build map marker points from doctor cabinet GPS data
  const markerPoints = useMemo(() => {
    const points = [];
    const seenCabinets = new Set();

    filteredDoctors.forEach((doctor) => {
      const cabinets = doctor.doctorCabinets || [];
      cabinets.forEach((dc) => {
        const cab = dc.cabinet;
        if (!cab || cab.latitude == null || cab.longitude == null) return;
        const lat = Number(cab.latitude);
        const lng = Number(cab.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const cabinetKey = cab.id;
        if (seenCabinets.has(cabinetKey)) {
          // Add doctor info to existing cabinet marker
          const existing = points.find((p) => p.cabinetId === cabinetKey);
          if (existing) {
            existing.doctorNames.push(doctor.nomComplet || 'Dr.');
            if (doctor.specialite && !existing.specialties.includes(doctor.specialite)) {
              existing.specialties.push(doctor.specialite);
            }
          }
          return;
        }

        seenCabinets.add(cabinetKey);

        if (cabinets.length === 1) {
          // Single cabinet — show individual doctor marker
          points.push({
            coords: [lat, lng],
            doctorName: doctor.nomComplet || 'Dr.',
            specialty: doctor.specialite || '',
            tarifLabel: doctor.tarifConsultation
              ? `${Number(doctor.tarifConsultation).toLocaleString('fr-FR')} MAD`
              : 'Tarif non renseigné',
            ville: cab.ville || '',
            cabinetName: cab.nom || '',
            cabinetId: cabinetKey,
            profileHref: `/doctor/${doctor.id}`,
            doctorId: doctor.id,
          });
        } else {
          // Multi-doctor cabinet
          points.push({
            coords: [lat, lng],
            doctorNames: [doctor.nomComplet || 'Dr.'],
            specialties: doctor.specialite ? [doctor.specialite] : [],
            ville: cab.ville || '',
            cabinetName: cab.nom || '',
            cabinetId: cabinetKey,
          });
        }
      });
    });

    return points;
  }, [filteredDoctors]);

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
                {showFiltersModal && (
                  <button
                    onClick={() => setShowFiltersModal(false)}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tarif maximum</h4>
                <input
                  type="range"
                  min="100"
                  max={maxTarifLimit}
                  step="50"
                  value={filters.tarifMax}
                  onChange={(e) => setFilters((current) => ({ ...current, tarifMax: Number(e.target.value) }))}
                  className="mt-2 w-full accent-[#1A6B8A]"
                />
                <p className="mt-1 text-sm font-medium text-[#1A6B8A]">Jusqu'à {Number(filters.tarifMax).toLocaleString('fr-FR')} MAD</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sexe du médecin</h4>
                <div className="mt-2 flex gap-1.5">
                  {['TOUT', 'HOMME', 'FEMME'].map((value) => (
                    <button
                      key={value}
                      onClick={() => setFilters((current) => ({ ...current, sexe: value }))}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${filters.sexe === value
                          ? 'bg-[#1A6B8A] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {value === 'TOUT' ? 'Tous' : value === 'HOMME' ? 'Homme' : 'Femme'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Langue</h4>
                <div className="mt-2 space-y-2">
                  {languageOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={filters.langues.includes(option.value)}
                        onChange={(e) => {
                          setFilters((current) => ({
                            ...current,
                            langues: e.target.checked
                              ? [...current.langues, option.value]
                              : current.langues.filter((v) => v !== option.value),
                          }));
                        }}
                        className="rounded border-slate-300 text-[#1A6B8A] accent-[#1A6B8A]"
                      />
                      <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={Boolean(filters.assuranceOnly)}
                  onChange={(e) => setFilters((current) => ({ ...current, assuranceOnly: e.target.checked }))}
                  className="rounded border-slate-300 text-[#1A6B8A] accent-[#1A6B8A]"
                />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Accepte mon assurance</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={Boolean(filters.videoOnly)}
                  onChange={(e) => setFilters((current) => ({ ...current, videoOnly: e.target.checked }))}
                  className="rounded border-slate-300 text-[#1A6B8A] accent-[#1A6B8A]"
                />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Disponible en vidéo</span>
              </label>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Note minimale</h4>
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((value) => (
                    <button
                      key={value}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          noteMin: current.noteMin === value ? 0 : value,
                        }))
                      }
                      className={`text-xl transition-transform hover:scale-110 ${Number(filters.noteMin) >= value ? 'text-amber-400' : 'text-slate-300'}`}
                    >
                      ★
                    </button>
                  ))}
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
            ) : filteredDoctors.length === 0 ? (
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
                {filteredDoctors.map((doctor) => (
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
            {!loading && filteredDoctors.length > 0 && (
              <div className="mt-10">
                <div className="mb-4 flex items-center gap-2">
                  <MapPinned size={18} className="text-[#1A6B8A]" />
                  <h3 className="text-lg font-bold text-slate-900">Localisation des médecins</h3>
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
                    markerPoints={markerPoints}
                    className="h-[400px]"
                    onMarkerProfileClick={(marker) => {
                      if (marker.doctorId) {
                        navigate(`/doctor/${marker.doctorId}`);
                      }
                    }}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>

      <AccessPromptModal isOpen={showAccessModal} onClose={() => setShowAccessModal(false)} />
    </div>
  );
}

export default SearchPage;
