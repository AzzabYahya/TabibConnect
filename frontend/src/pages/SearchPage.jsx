import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  Filter,
  HeartPulse,
  MapPinned,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  SlidersHorizontal,
  Video,
  X,
} from 'lucide-react';

import AccessPromptModal from '../components/common/AccessPromptModal';
import Skeleton from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import api from '../lib/api';
import { getCurrentSession } from '../lib/auth';

const DoctorSearchMap = lazy(() => import('../components/common/DoctorSearchMap'));

const maxTarifLimit = 2000;
const resultsPerPage = 6;

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

function SearchPage() {
  const navigate = useNavigate();
  const session = getCurrentSession();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => createDefaultFilters(searchParams));
  const [sortBy, setSortBy] = useState('pertinence');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('list');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
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
        setDoctors(normalizeDoctorList(response.data?.data));
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <h1 className="text-3xl font-bold text-slate-900">Rechercher un médecin</h1>
          <p className="mt-2 text-sm text-slate-600">Trouvez le professionnel de santé qui vous convient</p>

          {/* Search Bar */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="Symptôme, spécialité ou médecin..."
                value={filters.query}
                onChange={(e) => {
                  setFilters((current) => ({ ...current, query: e.target.value }));
                  setCurrentPage(1);
                }}
                className="flex-1 border-none bg-transparent outline-none text-sm"
              />
            </div>
            <select
              value={filters.specialite}
              onChange={(e) => {
                setFilters((current) => ({ ...current, specialite: e.target.value }));
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="">Spécialité</option>
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="">Ville</option>
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
            <Card className={`${showFiltersModal ? 'w-full max-w-sm rounded-2xl' : ''} space-y-6 p-6`}>
              {showFiltersModal && (
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600"
                >
                  <X size={16} /> Fermer
                </button>
              )}

              <div>
                <h3 className="font-semibold text-slate-900">Tarif maximum</h3>
                <input
                  type="range"
                  min="100"
                  max={maxTarifLimit}
                  step="50"
                  value={filters.tarifMax}
                  onChange={(e) => setFilters((current) => ({ ...current, tarifMax: Number(e.target.value) }))}
                  className="mt-2 w-full"
                />
                <p className="mt-2 text-sm text-slate-600">Jusqu'à {Number(filters.tarifMax).toLocaleString('fr-FR')} MAD</p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">Sexe du médecin</h3>
                <div className="mt-2 space-y-2">
                  {['TOUT', 'HOMME', 'FEMME'].map((value) => (
                    <label key={value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="sexe"
                        value={value}
                        checked={filters.sexe === value}
                        onChange={(e) => setFilters((current) => ({ ...current, sexe: e.target.value }))}
                        className="rounded"
                      />
                      <span className="text-sm">{value === 'TOUT' ? 'Tous' : value === 'HOMME' ? 'Homme' : 'Femme'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">Langue</h3>
                <div className="mt-2 space-y-2">
                  {languageOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
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
                        className="rounded"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(filters.assuranceOnly)}
                  onChange={(e) => setFilters((current) => ({ ...current, assuranceOnly: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium">Accepte mon assurance</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(filters.videoOnly)}
                  onChange={(e) => setFilters((current) => ({ ...current, videoOnly: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium">Disponible en vidéo</span>
              </label>

              <div>
                <h3 className="font-semibold text-slate-900">Note minimale</h3>
                <div className="mt-2 flex items-center gap-2">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((value) => (
                    <button
                      key={value}
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          noteMin: current.noteMin === value ? 0 : value,
                        }))
                      }
                      className={`text-xl ${Number(filters.noteMin) >= value ? 'text-yellow-400' : 'text-slate-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-600">Recherche médicale</p>
                <h2 className="text-xl font-bold text-slate-900">{filteredDoctors.length} médecin(s) trouvé(s)</h2>
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
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results */}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : filteredDoctors.length === 0 ? (
              <Card className="border-l-4 border-l-amber-400 bg-amber-50 p-6 text-center">
                <Sparkles className="mx-auto mb-2 h-8 w-8 text-amber-600" />
                <p className="font-semibold text-slate-900">Aucun médecin trouvé</p>
                <p className="mt-1 text-sm text-slate-600">Essayez de modifier vos critères de recherche</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredDoctors.map((doctor) => (
                  <Card key={doctor.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-4">
                      <Avatar name={doctor.nomComplet} size="lg" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{doctor.nomComplet}</h3>
                        <p className="text-sm text-slate-600">{doctor.specialite}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {doctor.accepteAssurance && <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"><ShieldCheck size={12} /> Assurance</span>}
                          {inferTeleconsultation(doctor) && <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"><Video size={12} /> Vidéo</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">{Number(doctor.tarifConsultation || 0).toLocaleString('fr-FR')} MAD</p>
                        <div className="flex items-center gap-1">
                          <Star size={14} className="fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-slate-600">{Number(doctor.ratingAverage || 0).toFixed(1)}</span>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleBooking(doctor)}>
                        Prendre RDV <ArrowRight size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
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
