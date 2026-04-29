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
import api from '../lib/api';
import { getCurrentSession } from '../lib/auth';
import { formatSpecialtyLabel } from '../lib/frenchText';

import '../styles/search-page.css';

const DoctorSearchMap = lazy(() => import('../components/common/DoctorSearchMap'));

const maxTarifLimit = 2000;
const resultsPerPage = 3;

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
  'Psychiatrie',
  'Urologie',
  'Endocrinologie',
  'Gastro-entérologie',
  'Rhumatologie',
];

const cityOptions = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès', 'Oujda', 'Kénitra', 'Salé'];

const languageOptions = [
  { label: 'Arabe', value: 'ARABE' },
  { label: 'Français', value: 'FRANCAIS' },
  { label: 'Amazigh', value: 'AMAZIGH' },
];

const querySuggestions = ['douleur thoracique', 'maux de tête', 'cardiologue', 'pédiatre', 'dermatologue', 'contrôle annuel'];

const sortOptions = [
  { label: 'Pertinence', value: 'pertinence' },
  { label: 'Disponibilité', value: 'disponibilite' },
  { label: 'Tarif', value: 'tarif' },
  { label: 'Note', value: 'note' },
];

const availabilityLabels = {
  TOUT: 'Toutes',
  AUJOURDHUI: "Aujourd'hui",
  SEMAINE: 'Cette semaine',
};

const genderLabels = {
  TOUT: 'Tous',
  HOMME: 'Homme',
  FEMME: 'Femme',
};

const toneClasses = ['teal', 'blue', 'purple', 'amber', 'coral'];

const toneColors = {
  teal: '#1a6b8a',
  blue: '#2851d1',
  purple: '#6845d8',
  amber: '#d98d12',
  coral: '#ea5d4d',
};

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

const hashString = (value = '') =>
  String(value)
    .split('')
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);

const toneFromName = (value = '') => toneClasses[hashString(value) % toneClasses.length];

const getInitials = (name = '') =>
  String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'TC';

const normalizeDoctorLanguage = (value = '') => {
  const normalized = String(value).trim().toLowerCase();

  if (!normalized) return '';
  if (normalized.includes('amazigh') || normalized.includes('tamazight') || normalized.includes('berber')) return 'AMAZIGH';
  if (normalized.includes('fran') || normalized.includes('french')) return 'FRANCAIS';
  if (normalized.includes('darija') || normalized.includes('arabe') || normalized.includes('arab')) return 'ARABE';

  return normalized.toUpperCase();
};

const inferGender = (doctor) => {
  const text = `${doctor.nomComplet || ''} ${doctor.user?.email || ''}`.toLowerCase();

  if (/(salma|khadija|fatima|aicha|meryem|hajar|yasmine|nadia)/.test(text)) return 'FEMME';
  if (/(amine|youssef|mohamed|omar|hamza|karim|rachid)/.test(text)) return 'HOMME';

  return 'TOUT';
};

const inferTeleconsultation = (doctor) => {
  if (typeof doctor.bio === 'string' && /tele/i.test(doctor.bio)) return true;
  return Number(doctor.experience || 0) >= 8;
};

const isWithinCurrentWeek = (dateValue) => {
  const now = new Date();
  const target = new Date(dateValue);
  const diffInMs = target.getTime() - now.getTime();

  return diffInMs >= 0 && diffInMs <= 7 * 24 * 60 * 60 * 1000;
};

const isToday = (dateValue) => {
  const today = new Date();
  const target = new Date(dateValue);

  return today.toISOString().slice(0, 10) === target.toISOString().slice(0, 10);
};

const formatNextAvailabilityLabel = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  const dayLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const timeLabel = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replace(':', 'h');

  return `Disponible ${dayLabel} à ${timeLabel}`;
};

const formatClockLabel = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(':', 'h');
};

const getDoctorLanguageBadges = (doctor) => {
  const rawLanguages = Array.isArray(doctor.languesParlees) ? doctor.languesParlees : [];
  return rawLanguages.map((value) => normalizeDoctorLanguage(value));
};

const getDoctorCity = (doctor) => {
  const cities = (doctor.doctorCabinets || []).map((entry) => entry.cabinet?.ville).filter(Boolean);
  return cities[0] || 'Maroc';
};

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const leftBound = Math.max(2, currentPage - 1);
  const rightBound = Math.min(totalPages - 1, currentPage + 1);

  if (leftBound > 2) items.push('ellipsis-left');
  for (let page = leftBound; page <= rightBound; page += 1) items.push(page);
  if (rightBound < totalPages - 1) items.push('ellipsis-right');
  items.push(totalPages);

  return items;
};

function SearchPillButton({ active, children, onClick, ariaLabel, type = 'button' }) {
  return (
    <button type={type} aria-label={ariaLabel} aria-pressed={active} onClick={onClick} className={`search-pill-button ${active ? 'is-active' : ''}`}>
      {children}
    </button>
  );
}

function SearchSwitch({ checked, onChange, label, hint, tone = 'default' }) {
  return (
    <button type="button" className={`search-switch search-switch--${tone}`} onClick={() => onChange(!checked)}>
      <span className="search-switch__copy">
        <span className="search-switch__label">{label}</span>
        {hint ? <span className="search-switch__hint">{hint}</span> : null}
      </span>
      <span className={`search-switch__track ${checked ? 'is-on' : ''}`}>
        <span className="search-switch__thumb" />
      </span>
    </button>
  );
}

function DoctorAvatar({ name, tone }) {
  return <div className={`doctor-avatar doctor-avatar--${tone}`}>{getInitials(name)}</div>;
}

function SearchFiltersPanel({ mode = 'desktop', filters, setFilters, onApply, onReset, onClose }) {
  const selectedLanguages = filters.langues || [];

  const toggleLanguage = (language) => {
    setFilters((current) => ({
      ...current,
      langues: current.langues.includes(language)
        ? current.langues.filter((value) => value !== language)
        : [...current.langues, language],
    }));
  };

  return (
    <div className={`filters-panel__shell filters-panel__shell--${mode}`}>
      <div className="filters-panel__top">
        <div className="filters-panel__header">
          <h2>Affiner la recherche</h2>
          <button type="button" className="filters-panel__reset" onClick={onReset}>
            Réinitialiser
          </button>
          {onClose ? (
            <button type="button" className="filters-panel__close" onClick={onClose} aria-label="Fermer les filtres">
              <X size={16} />
            </button>
          ) : null}
        </div>

        <div className="filters-panel__stack">
          <section className="filter-block">
            <label className="filter-label">Disponibilité</label>
            <div className="filter-pills filter-pills--compact">
              {Object.entries(availabilityLabels).map(([value, label]) => (
                <SearchPillButton key={value} active={filters.disponibilite === value} onClick={() => setFilters((current) => ({ ...current, disponibilite: value }))}>
                  {label}
                </SearchPillButton>
              ))}
            </div>
          </section>

          <section className="filter-block">
            <label className="filter-label">Tarif maximum</label>
            <div className="filter-range">
              <input
                type="range"
                min="100"
                max={maxTarifLimit}
                step="50"
                value={filters.tarifMax}
                onChange={(event) => setFilters((current) => ({ ...current, tarifMax: Number(event.target.value) }))}
                aria-label="Tarif maximum"
              />
              <div className="filter-range__meta">jusqu'à {Number(filters.tarifMax).toLocaleString('fr-FR')} MAD</div>
            </div>
          </section>

          <section className="filter-block">
            <label className="filter-label">Sexe médecin</label>
            <div className="filter-pills filter-pills--compact">
              {Object.entries(genderLabels).map(([value, label]) => (
                <SearchPillButton key={value} active={filters.sexe === value} onClick={() => setFilters((current) => ({ ...current, sexe: value }))}>
                  {label}
                </SearchPillButton>
              ))}
            </div>
          </section>

          <section className="filter-block">
            <label className="filter-label">Langue</label>
            <div className="filter-pills filter-pills--wrap">
              {languageOptions.map((option) => (
                <SearchPillButton key={option.value} active={selectedLanguages.includes(option.value)} onClick={() => toggleLanguage(option.value)}>
                  {option.label}
                </SearchPillButton>
              ))}
            </div>
          </section>

          <section className="filter-block">
            <SearchSwitch
              checked={Boolean(filters.assuranceOnly)}
              onChange={(checked) => setFilters((current) => ({ ...current, assuranceOnly: checked }))}
              label="Accepte mon assurance"
              hint="Filtre uniquement les praticiens compatibles"
              tone="insurance"
            />
          </section>

          <section className="filter-block">
            <SearchSwitch
              checked={Boolean(filters.videoOnly)}
              onChange={(checked) => setFilters((current) => ({ ...current, videoOnly: checked }))}
              label="Disponible en vidéo"
              hint="Montre uniquement les médecins en téléconsultation"
              tone="video"
            />
          </section>

          <section className="filter-block">
            <label className="filter-label">Note minimale</label>
            <div className="rating-filter">
              {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => {
                const active = Number(filters.noteMin) >= value;

                return (
                  <button
                    key={value}
                    type="button"
                    className={`rating-filter__star ${active ? 'is-active' : ''}`}
                    aria-label={`Note minimale ${value} étoiles`}
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        noteMin: current.noteMin === value ? 0 : value,
                      }))
                    }
                  >
                    <Star size={16} fill={active ? 'currentColor' : 'none'} />
                  </button>
                );
              })}
              <span className="rating-filter__hint">{filters.noteMin > 0 ? `note ≥ ${filters.noteMin}` : 'Toutes les notes'}</span>
            </div>
          </section>
        </div>
      </div>

      <div className="filters-panel__footer">
        <button type="button" className="filters-panel__apply" onClick={onApply}>
          Appliquer les filtres
        </button>
      </div>

      <div className="filters-panel__art" aria-hidden="true">
        <div className="filters-panel__art-header">
          <span className="filters-panel__art-eyebrow">Soins guidés</span>
          <span className="filters-panel__art-title">Une vue médicale claire et rassurante</span>
        </div>

        <div className="filters-panel__art-scene">
          <span className="filters-panel__art-orbit filters-panel__art-orbit--one" />
          <span className="filters-panel__art-orbit filters-panel__art-orbit--two" />
          <span className="filters-panel__art-pulse" />

          <div className="filters-panel__art-core">
            <HeartPulse size={22} />
          </div>

          <div className="filters-panel__art-card filters-panel__art-card--left">
            <ShieldCheck size={12} />
            Vérifié
          </div>

          <div className="filters-panel__art-card filters-panel__art-card--right">
            <Sparkles size={12} />
            Disponible
          </div>
        </div>
      </div>
    </div>
  );
}

function DoctorCard({ doctor, onViewProfile, onBook }) {
  const nextAvailabilityLabel = formatNextAvailabilityLabel(doctor.nextAvailability?.start);
  const nextAvailabilityTime = doctor.nextAvailability?.start ? formatClockLabel(doctor.nextAvailability.start) : '';
  const tone = doctor.tone || toneFromName(doctor.nomComplet || doctor.user?.email || 'doctor');
  const city = doctor.nextAvailability?.cabinet?.ville || getDoctorCity(doctor);
  const cabinetName = doctor.nextAvailability?.cabinet?.nom;
  const tarif = Number(doctor.tarifConsultation || 0);

  return (
    <article className={`doctor-card doctor-card--${tone}`}>
      <div className="doctor-card__top">
        <div className="doctor-card__identity">
          <DoctorAvatar name={doctor.nomComplet || doctor.user?.email || 'Doctor'} tone={tone} />

          <div className="doctor-card__content">
            <div className="doctor-card__headline">
              <div className="doctor-card__title-block">
                <h3>{doctor.nomComplet || doctor.user?.email}</h3>
                <p>{formatSpecialtyLabel(doctor.specialite)}</p>
              </div>

              <div className="doctor-card__price-block">
                <strong>{tarif.toLocaleString('fr-FR')} MAD</strong>
                <span>tarif consultation</span>
              </div>
            </div>

            <div className="doctor-card__chips">
              <span className="doctor-chip doctor-chip--insurance">
                <ShieldCheck size={12} />
                {doctor.accepteAssurance ? 'Assurance' : 'Sans assurance'}
              </span>
              {doctor.teleconsultationEnabled ? (
                <span className="doctor-chip doctor-chip--video">
                  <Video size={12} />
                  Téléconsultation
                </span>
              ) : null}
              <span className="doctor-chip doctor-chip--neutral">{genderLabels[doctor.inferredGender] || 'Tous'}</span>
            </div>

            <div className="doctor-card__rating">
              <span className="doctor-card__stars">
                <Star size={12} fill="currentColor" />
                {Number(doctor.rating?.average || 0).toFixed(1)}
              </span>
              <span>·</span>
              <span>{Number(doctor.rating?.count || 0)} avis</span>
              <span>·</span>
              <span>{doctor.languesParlees?.length ? doctor.languesParlees.join(', ') : 'Langues non renseignées'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="doctor-card__availability">
        <span>
          <MapPinned size={14} />
          {city}
          {cabinetName ? `, ${cabinetName}` : ''}
        </span>
        <span>
          <CalendarClock size={14} />
          {nextAvailabilityLabel || nextAvailabilityTime || 'Prochain créneau à confirmer'}
        </span>
      </div>

      <div className="doctor-card__actions">
        <button type="button" className="doctor-card__secondary" onClick={() => onViewProfile(doctor)}>
          Voir le profil
        </button>
        <button type="button" className="doctor-card__primary" onClick={() => onBook(doctor)}>
          Prendre RDV
          <ArrowRight size={14} />
        </button>
      </div>
    </article>
  );
}

function ResultsToolbar({ count, sortBy, setSortBy, viewMode, setViewMode, onOpenFilters, activeFilterSummary, smartSpecialty }) {
  return (
    <div className="results-toolbar">
      <div className="results-toolbar__headline">
        <p className="results-toolbar__kicker">Recherche médicale</p>
        <h2>{count} médecin(s) trouvé(s)</h2>
        <p className="results-toolbar__subtitle">Filtrez par spécialité, ville et préférences puis comparez les cabinets.</p>
      </div>

      <div className="results-toolbar__controls">
        <button type="button" className="results-toolbar__filters-button" onClick={onOpenFilters}>
          <Filter size={14} />
          Filtres
        </button>

        <div className="results-toolbar__sort">
          <SlidersHorizontal size={14} />
          <span>Trier</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Trier les médecins">
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="results-toolbar__view-toggle" role="tablist" aria-label="Changer de vue">
          <button type="button" className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')}>
            <span>≡</span>
            Liste
          </button>
          <button type="button" className={viewMode === 'map' ? 'is-active' : ''} onClick={() => setViewMode('map')}>
            <MapPinned size={14} />
            Carte
          </button>
        </div>
      </div>

      {activeFilterSummary.length > 0 || smartSpecialty ? (
        <div className="results-toolbar__summary">
          {smartSpecialty ? <span className="results-toolbar__summary-chip is-warning">Suggestion: {smartSpecialty}</span> : null}
          {activeFilterSummary.map((item) => (
            <span key={`${item.label}-${item.value}`} className="results-toolbar__summary-chip">
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SearchPagination({ currentPage, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1 || totalItems <= resultsPerPage) return null;

  const start = (currentPage - 1) * resultsPerPage + 1;
  const end = Math.min(totalItems, currentPage * resultsPerPage);

  return (
    <div className="search-pagination">
      <div className="search-pagination__meta">
        Affichage {start} - {end} sur {totalItems} docteurs
      </div>

      <div className="search-pagination__menu" aria-label="Pagination des médecins">
        <button type="button" className="search-pagination__button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          Précédent
        </button>

        <div className="search-pagination__pages">
          {getPaginationItems(currentPage, totalPages).map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                className={`search-pagination__page ${item === currentPage ? 'is-active' : ''}`}
                onClick={() => onPageChange(item)}
                aria-current={item === currentPage ? 'page' : undefined}
              >
                {item}
              </button>
            ) : (
              <span key={item} className="search-pagination__ellipsis" aria-hidden="true">
                …
              </span>
            )
          )}
        </div>

        <button type="button" className="search-pagination__button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
          Suivant
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="empty-state">
      <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80" alt="Médecin disponible en attente" loading="lazy" decoding="async" />
      <h3>Aucun médecin trouvé avec ces critères</h3>
      <p>Essayez d'élargir vos filtres ou de modifier la spécialité et la ville.</p>
      <button type="button" onClick={onReset}>
        Réinitialiser les filtres
      </button>
    </div>
  );
}

function useQueryForSearch(query) {
  const [state, setState] = useState({ suggestedSpecialties: [], results: [] });

  useEffect(() => {
    const trimmed = String(query || '').trim();

    if (trimmed.length < 2) {
      setState({ suggestedSpecialties: [], results: [] });
      return undefined;
    }

    let isMounted = true;

    api
      .get('/doctors/search', { params: { q: trimmed } })
      .then((response) => {
        if (isMounted) setState(response.data?.data || { suggestedSpecialties: [], results: [] });
      })
      .catch(() => {
        if (isMounted) setState({ suggestedSpecialties: [], results: [] });
      });

    return () => {
      isMounted = false;
    };
  }, [query]);

  return state;
}

function useDoctorsQuery(queryText, backendSpecialty, ville, disponibilite, assuranceOnly, tarifMax) {
  const [state, setState] = useState({ data: [], isLoading: true, isError: false });

  useEffect(() => {
    let isMounted = true;
    setState((current) => ({ ...current, isLoading: true, isError: false }));

    api
      .get('/doctors', {
        params: {
          q: queryText.trim() || undefined,
          specialite: backendSpecialty || undefined,
          ville: ville.trim() || undefined,
          availableToday: disponibilite === 'AUJOURDHUI' ? true : undefined,
          accepteAssurance: assuranceOnly ? true : undefined,
          maxTarif: Number(tarifMax) < maxTarifLimit ? Number(tarifMax) : undefined,
        },
      })
      .then((response) => {
        if (isMounted) setState({ data: response.data?.data || [], isLoading: false, isError: false });
      })
      .catch(() => {
        if (isMounted) setState({ data: [], isLoading: false, isError: true });
      });

    return () => {
      isMounted = false;
    };
  }, [queryText, backendSpecialty, ville, disponibilite, assuranceOnly, tarifMax]);

  return state;
}

function useNextAvailabilitiesQuery(doctorIds) {
  const [state, setState] = useState({ data: {}, isLoading: false, isError: false });
  const doctorIdsKey = doctorIds.join('|');

  useEffect(() => {
    if (!doctorIds.length) {
      setState({ data: {}, isLoading: false, isError: false });
      return undefined;
    }

    let isMounted = true;
    setState({ data: {}, isLoading: true, isError: false });

    Promise.all(
      doctorIds.map(async (doctorId) => {
        const nextAvailability = await findNextSlotForDoctor(doctorId, 7);
        return [doctorId, nextAvailability];
      })
    )
      .then((entries) => {
        if (isMounted) setState({ data: Object.fromEntries(entries), isLoading: false, isError: false });
      })
      .catch(() => {
        if (isMounted) setState({ data: {}, isLoading: false, isError: true });
      });

    return () => {
      isMounted = false;
    };
  }, [doctorIdsKey]);

  return state;
}

const findNextSlotForDoctor = async (doctorId, daysWindow = 7) => {
  for (let offset = 0; offset < daysWindow; offset += 1) {
    const date = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
    const dateISO = date.toISOString().slice(0, 10);

    const response = await api.get(`/doctors/${doctorId}/availabilities`, { params: { date: dateISO } });
    const availabilities = response.data?.data?.availabilities || [];

    for (const availability of availabilities) {
      const nextSlot = (availability.slots || []).find((slot) => new Date(slot.start).getTime() > Date.now());

      if (nextSlot) {
        return {
          start: nextSlot.start,
          end: nextSlot.end,
          cabinet: availability.cabinet,
          disponibiliteId: availability.disponibiliteId,
        };
      }
    }
  }

  return null;
};

function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = getCurrentSession();

  const [draftFilters, setDraftFilters] = useState(() => createDefaultFilters(searchParams));
  const [appliedFilters, setAppliedFilters] = useState(() => createDefaultFilters(searchParams));
  const [sortBy, setSortBy] = useState('pertinence');
  const [viewMode, setViewMode] = useState('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedMapMarker, setSelectedMapMarker] = useState(null);
  const [bookingPromptDoctor, setBookingPromptDoctor] = useState(null);

  useEffect(() => {
    setSelectedMapMarker(null);
  }, [viewMode]);

  const smartSearchQueryData = useQueryForSearch(appliedFilters.query);
  const inferredSpecialty = smartSearchQueryData?.suggestedSpecialties?.[0] || '';
  const backendSpecialty = appliedFilters.specialite.trim() || inferredSpecialty;

  const doctorsQuery = useDoctorsQuery(
    appliedFilters.query,
    backendSpecialty,
    appliedFilters.ville,
    appliedFilters.disponibilite,
    appliedFilters.assuranceOnly,
    appliedFilters.tarifMax
  );

  const doctorIds = useMemo(() => (doctorsQuery.data || []).map((doctor) => doctor.id), [doctorsQuery.data]);
  const nextAvailabilitiesQuery = useNextAvailabilitiesQuery(doctorIds);

  const relevanceByDoctorId = useMemo(() => {
    const map = new Map();
    (smartSearchQueryData?.results || []).forEach((doctor, index) => map.set(doctor.id, index + 1));
    return map;
  }, [smartSearchQueryData]);

  const doctorsWithMetadata = useMemo(
    () =>
      (doctorsQuery.data || []).map((doctor) => ({
        ...doctor,
        inferredGender: inferGender(doctor),
        teleconsultationEnabled: inferTeleconsultation(doctor),
        nextAvailability: nextAvailabilitiesQuery.data?.[doctor.id] || null,
        relevanceRank: relevanceByDoctorId.get(doctor.id) || Number.MAX_SAFE_INTEGER,
        tone: toneFromName(doctor.nomComplet || doctor.user?.email || 'doctor'),
      })),
    [doctorsQuery.data, nextAvailabilitiesQuery.data, relevanceByDoctorId]
  );

  const filteredDoctors = useMemo(() => {
    const selectedLanguages = (appliedFilters.langues || []).map((value) => normalizeDoctorLanguage(value));

    const filtered = doctorsWithMetadata.filter((doctor) => {
      if (appliedFilters.specialite && formatSpecialtyLabel(doctor.specialite) !== appliedFilters.specialite) return false;
      if (appliedFilters.ville && !(doctor.doctorCabinets || []).some((entry) => entry.cabinet?.ville === appliedFilters.ville)) return false;
      if (selectedLanguages.length > 0) {
        const doctorLanguages = getDoctorLanguageBadges(doctor);
        if (!selectedLanguages.some((language) => doctorLanguages.includes(language))) return false;
      }
      if (appliedFilters.assuranceOnly && !doctor.accepteAssurance) return false;
      if (appliedFilters.videoOnly && !doctor.teleconsultationEnabled) return false;
      if (appliedFilters.sexe !== 'TOUT' && doctor.inferredGender !== appliedFilters.sexe) return false;
      if (Number(appliedFilters.noteMin) > 0 && Number(doctor.rating?.average || 0) < Number(appliedFilters.noteMin)) return false;
      if (appliedFilters.disponibilite === 'SEMAINE') return Boolean(doctor.nextAvailability?.start) && isWithinCurrentWeek(doctor.nextAvailability.start);
      if (appliedFilters.disponibilite === 'AUJOURDHUI') return Boolean(doctor.nextAvailability?.start) && isToday(doctor.nextAvailability.start);

      return true;
    });

    const sorted = [...filtered];
    if (sortBy === 'tarif') return sorted.sort((a, b) => Number(a.tarifConsultation || 0) - Number(b.tarifConsultation || 0));
    if (sortBy === 'note') return sorted.sort((a, b) => Number(b.rating?.average || 0) - Number(a.rating?.average || 0));
    if (sortBy === 'disponibilite') {
      return sorted.sort((a, b) => {
        const aDate = a.nextAvailability?.start ? new Date(a.nextAvailability.start).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.nextAvailability?.start ? new Date(b.nextAvailability.start).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });
    }

    return sorted.sort((a, b) => {
      if (a.relevanceRank !== b.relevanceRank) return a.relevanceRank - b.relevanceRank;
      return Number(b.rating?.average || 0) - Number(a.rating?.average || 0);
    });
  }, [appliedFilters, doctorsWithMetadata, sortBy]);

  const markerPoints = useMemo(
    () =>
      filteredDoctors.flatMap((doctor) =>
        (doctor.doctorCabinets || [])
          .map((entry) => entry.cabinet)
          .filter(Boolean)
          .map((cabinet) => ({
            id: `${doctor.id}-${cabinet.id}`,
            doctorId: doctor.id,
            doctorName: doctor.nomComplet || doctor.user?.email || 'Doctor',
            specialty: formatSpecialtyLabel(doctor.specialite),
            tarif: Number(doctor.tarifConsultation || 0),
            ville: cabinet.ville,
            cabinetName: cabinet.nom,
            profileHref: `/doctor/${doctor.id}`,
            coords: [Number(cabinet.latitude), Number(cabinet.longitude)],
            tone: doctor.tone,
            color: toneColors[doctor.tone] || toneColors.teal,
            ratingAverage: Number(doctor.rating?.average || 0),
            ratingCount: Number(doctor.rating?.count || 0),
            nextAvailability: doctor.nextAvailability?.start || null,
            availabilityLabel: formatNextAvailabilityLabel(doctor.nextAvailability?.start),
          }))
          .filter((marker) => Number.isFinite(marker.coords[0]) && Number.isFinite(marker.coords[1]))
      ),
    [filteredDoctors]
  );

  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / resultsPerPage));

  const paginatedDoctors = useMemo(() => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    return filteredDoctors.slice(startIndex, startIndex + resultsPerPage);
  }, [currentPage, filteredDoctors]);

  const paginatedMarkerPoints = useMemo(() => {
    if (!paginatedDoctors.length) return [];
    const visibleDoctorIds = new Set(paginatedDoctors.map((doctor) => doctor.id));
    return markerPoints.filter((marker) => visibleDoctorIds.has(marker.doctorId));
  }, [markerPoints, paginatedDoctors]);

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!selectedMapMarker) return;
    if (viewMode !== 'list') return;
    if (!paginatedMarkerPoints.some((marker) => marker.id === selectedMapMarker.id)) {
      setSelectedMapMarker(null);
    }
  }, [paginatedMarkerPoints, selectedMapMarker, viewMode]);

  const activeFilterSummary = useMemo(() => {
    const summary = [];

    if (appliedFilters.query.trim()) summary.push({ label: 'Recherche', value: appliedFilters.query.trim() });
    if (appliedFilters.specialite.trim()) summary.push({ label: 'Spécialité', value: formatSpecialtyLabel(appliedFilters.specialite) });
    if (appliedFilters.ville.trim()) summary.push({ label: 'Ville', value: appliedFilters.ville.trim() });
    if (appliedFilters.disponibilite !== 'TOUT') summary.push({ label: 'Disponibilité', value: availabilityLabels[appliedFilters.disponibilite] });
    if (Number(appliedFilters.tarifMax) < maxTarifLimit) summary.push({ label: 'Budget', value: `${Number(appliedFilters.tarifMax).toLocaleString('fr-FR')} MAD` });
    if (appliedFilters.sexe !== 'TOUT') summary.push({ label: 'Sexe', value: genderLabels[appliedFilters.sexe] });
    if ((appliedFilters.langues || []).length > 0) {
      summary.push({
        label: 'Langue',
        value: (appliedFilters.langues || []).map((language) => languageOptions.find((option) => option.value === language)?.label || language).join(', '),
      });
    }
    if (appliedFilters.assuranceOnly) summary.push({ label: 'Assurance', value: 'Acceptée' });
    if (appliedFilters.videoOnly) summary.push({ label: 'Téléconsultation', value: 'Disponible' });
    if (Number(appliedFilters.noteMin) > 0) summary.push({ label: 'Note', value: `≥ ${appliedFilters.noteMin}` });

    return summary;
  }, [appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setSelectedMapMarker(null);
    setCurrentPage(1);

    const params = new URLSearchParams();
    if (draftFilters.query.trim()) params.set('q', draftFilters.query.trim());
    if (draftFilters.ville.trim()) params.set('ville', draftFilters.ville.trim());
    if (draftFilters.specialite.trim()) params.set('specialite', draftFilters.specialite.trim());
    setSearchParams(params, { replace: true });
    setMobileFiltersOpen(false);
  };

  const resetFilters = () => {
    const resetState = createDefaultFilters(new URLSearchParams());
    setDraftFilters(resetState);
    setAppliedFilters(resetState);
    setSortBy('pertinence');
    setViewMode('list');
    setCurrentPage(1);
    setSelectedMapMarker(null);
    setSearchParams({}, { replace: true });
    setMobileFiltersOpen(false);
  };

  const handleBookDoctor = (doctor) => {
    const bookingHref = `/doctor/${doctor.id}?tab=availabilities`;

    if (!session.isAuthenticated) {
      setBookingPromptDoctor({
        doctorName: doctor.nomComplet || doctor.user?.email || 'ce médecin',
        redirectTo: bookingHref,
      });
      return;
    }

    navigate(bookingHref);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedMapMarker(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const heroSpecialtySuggestion = smartSearchQueryData?.suggestedSpecialties?.[0] || '';
  const filteredCount = filteredDoctors.length;
  const isLoading = doctorsQuery.isLoading || nextAvailabilitiesQuery.isLoading;
  const hasErrors = doctorsQuery.isError || nextAvailabilitiesQuery.isError;
  const shouldPaginate = viewMode === 'list' && filteredCount > resultsPerPage;

  return (
    <div className="search-page">
      <header className="search-header">
        <div className="search-header__inner">
          <div className="search-header__title-block">
            <p className="search-header__eyebrow">Recherche médicale au Maroc</p>
            <h1>Trouvez votre médecin au Maroc</h1>
          </div>

          <form
            className="search-hero-bar"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters();
            }}
          >
            <div className="search-hero-field search-hero-field--query">
              <Search size={16} className="search-hero-field__icon" />
              <input
                id="search-query"
                name="query"
                type="text"
                list="search-suggestions"
                placeholder="Symptôme ou spécialité..."
                value={draftFilters.query}
                onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
                autoComplete="off"
              />
            </div>

            <span className="search-hero-divider" aria-hidden="true" />

            <div className="search-hero-field search-hero-field--city">
              <MapPinned size={16} className="search-hero-field__icon" />
              <select
                id="search-ville"
                name="ville"
                value={draftFilters.ville}
                onChange={(event) => setDraftFilters((current) => ({ ...current, ville: event.target.value }))}
              >
                <option value="">Ville</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="search-hero-field__chevron" />
            </div>

            <button type="submit" className="search-hero-submit">
              <Search size={16} />
              Rechercher
            </button>
          </form>

          <datalist id="search-suggestions">
            {[...querySuggestions, ...specialtyOptions.slice(0, 8), ...cityOptions.slice(0, 5)].map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
      </header>

      <div className="search-body">
        <aside className="filters-panel">
          <SearchFiltersPanel mode="desktop" filters={draftFilters} setFilters={setDraftFilters} onApply={applyFilters} onReset={resetFilters} />
        </aside>

        <section className="results-panel">
          {activeFilterSummary.length === 0 ? (
            <article className="search-promo-banner search-promo-banner--illustration" aria-label="Illustration médicale animée">
              <div className="search-promo-banner__scene" aria-hidden="true">
                <span className="search-promo-banner__orb search-promo-banner__orb--one" />
                <span className="search-promo-banner__orb search-promo-banner__orb--two" />
                <span className="search-promo-banner__orb search-promo-banner__orb--three" />
                <span className="search-promo-banner__pulse" />
                <div className="search-promo-banner__figure">
                  <span className="search-promo-banner__figure-halo" />
                  <span className="search-promo-banner__figure-head" />
                  <span className="search-promo-banner__figure-shoulders" />
                </div>
                <div className="search-promo-banner__card search-promo-banner__card--left">
                  <Search size={12} />
                  Médecins vérifiés
                </div>
                <div className="search-promo-banner__card search-promo-banner__card--right">
                  <CalendarClock size={12} />
                  Disponibles cette semaine
                </div>
              </div>
              <div className="search-promo-banner__overlay">
                <p>Des médecins vérifiés INPE — disponibles cette semaine</p>
              </div>
            </article>
          ) : null}

          <ResultsToolbar
            count={filteredCount}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onOpenFilters={() => setMobileFiltersOpen(true)}
            activeFilterSummary={activeFilterSummary}
            smartSpecialty={heroSpecialtySuggestion}
          />

          {isLoading ? (
            <div className="results-loading">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : null}

          {hasErrors ? (
            <div className="results-message results-message--error">Impossible de charger les médecins. Vérifiez que le backend est disponible.</div>
          ) : null}

          {!isLoading && !hasErrors && filteredCount === 0 ? <EmptyState onReset={resetFilters} /> : null}

          {!isLoading && !hasErrors && filteredCount > 0 ? (
            viewMode === 'list' ? (
              <div className="results-list">
                {paginatedDoctors.map((doctor) => (
                  <DoctorCard key={doctor.id} doctor={doctor} onViewProfile={(currentDoctor) => navigate(`/doctor/${currentDoctor.id}`)} onBook={handleBookDoctor} />
                ))}
              </div>
            ) : (
              <div className="search-map-stage">
                <Suspense
                  fallback={
                    <div className="results-loading">
                      <Skeleton className="h-[420px]" />
                    </div>
                  }
                >
                  <DoctorSearchMap
                    markerPoints={markerPoints}
                    className="search-map-stage__map"
                    onMarkerSelect={setSelectedMapMarker}
                    onMarkerProfileClick={(marker) => navigate(marker.profileHref || `/doctor/${marker.doctorId}`)}
                  />
                </Suspense>

                <div className="search-map-stage__footer">
                  {selectedMapMarker ? (
                    <div className={`search-map-card doctor-avatar-shell doctor-avatar-shell--${selectedMapMarker.tone}`}>
                      <div className="search-map-card__top">
                        <DoctorAvatar name={selectedMapMarker.doctorName} tone={selectedMapMarker.tone} />
                        <div className="search-map-card__copy">
                          <h3>{selectedMapMarker.doctorName}</h3>
                          <p>{selectedMapMarker.specialty}</p>
                          <div className="search-map-card__meta">
                            <span>
                              <MapPinned size={12} />
                              {selectedMapMarker.ville}
                            </span>
                            <span>
                              <CalendarClock size={12} />
                              {selectedMapMarker.availabilityLabel || 'Disponibilité à venir'}
                            </span>
                          </div>
                        </div>
                        <div className="search-map-card__price">
                          <strong>{Number(selectedMapMarker.tarif).toLocaleString('fr-FR')} MAD</strong>
                          <span>tarif consultation</span>
                        </div>
                      </div>

                      <div className="search-map-card__actions">
                        <button type="button" onClick={() => navigate(selectedMapMarker.profileHref || `/doctor/${selectedMapMarker.doctorId}`)}>
                          Voir le profil
                        </button>
                        <button
                          type="button"
                          className="is-primary"
                          onClick={() =>
                            handleBookDoctor({
                              id: selectedMapMarker.doctorId,
                              nomComplet: selectedMapMarker.doctorName,
                            })
                          }
                        >
                          Prendre RDV
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="search-map-card search-map-card--empty">
                      <Sparkles size={16} />
                      Cliquez sur un marqueur pour afficher le médecin sélectionné.
                    </div>
                  )}
                </div>
              </div>
            )
          ) : null}

          {shouldPaginate && !isLoading && !hasErrors && filteredCount > 0 ? (
            <SearchPagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredCount} onPageChange={handlePageChange} />
          ) : null}
        </section>
      </div>

      {mobileFiltersOpen ? (
        <div className="search-mobile-drawer" role="dialog" aria-modal="true" aria-label="Filtres de recherche">
          <button type="button" className="search-mobile-drawer__overlay" onClick={() => setMobileFiltersOpen(false)} aria-label="Fermer les filtres" />
          <div className="search-mobile-drawer__panel">
            <SearchFiltersPanel
              mode="drawer"
              filters={draftFilters}
              setFilters={setDraftFilters}
              onApply={applyFilters}
              onReset={resetFilters}
              onClose={() => setMobileFiltersOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <AccessPromptModal
        isOpen={Boolean(bookingPromptDoctor)}
        onClose={() => setBookingPromptDoctor(null)}
        redirectTo={bookingPromptDoctor?.redirectTo}
        doctorName={bookingPromptDoctor?.doctorName}
        title="Connexion requise pour réserver"
      />
    </div>
  );
}

export default SearchPage;