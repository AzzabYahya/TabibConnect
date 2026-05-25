import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Brain,
  ChevronLeft,
  ChevronRight,
  Bone,
  Baby,
  Ear,
  Eye,
  HeartPulse,
  Sparkles,
  Search,
  ShieldCheck,
  Star,
  Stethoscope,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import MotionCard from '../components/ui/MotionCard';
import Skeleton from '../components/ui/Skeleton';
import api from '../lib/api';
import {
  formatFrenchLabel,
  formatReviewDate,
  formatSpecialtyLabel,
  getInitials,
  getSpecialtyDisplayMeta,
  hashColor,
} from '../lib/frenchText';

const MotionSection = motion.section;
const HomeCabinetMap = lazy(() => import('../components/common/HomeCabinetMap'));

const homeSearchSchema = z.object({
  query: z.string().trim().min(2, 'Entrez un symptôme ou une spécialité'),
  ville: z.string().trim().min(1, 'Choisissez une ville'),
});

const searchPlaceholders = [
  'douleur thoracique...',
  'cardiologue...',
  'dermatologue Casablanca...',
  'pédiatre Rabat...',
];

const fallbackHomeData = {

  stats: [],
  specialties: [],
  hotspots: [],
  testimonials: [],
};

const statIconMap = {
  'Médecins vérifiés': Stethoscope,
  'Patients inscrits': UsersRound,
  'RDV enregistrés': CalendarDays,
  'Avis publiés': Star,
};

const specialtyVisualPalette = [
  { Icon: HeartPulse, backgroundColor: '#FEE2E2', color: '#BE123C', borderColor: '#FDA4AF' },
  { Icon: Brain, backgroundColor: '#EDE9FE', color: '#7C3AED', borderColor: '#C4B5FD' },
  { Icon: Bone, backgroundColor: '#FEF3C7', color: '#D97706', borderColor: '#FCD34D' },
  { Icon: Eye, backgroundColor: '#DBEAFE', color: '#2563EB', borderColor: '#93C5FD' },
  { Icon: Baby, backgroundColor: '#DCFCE7', color: '#16A34A', borderColor: '#86EFAC' },
  { Icon: Sparkles, backgroundColor: '#FCE7F3', color: '#DB2777', borderColor: '#F9A8D4' },
  { Icon: Ear, backgroundColor: '#E0F2FE', color: '#0284C7', borderColor: '#7DD3FC' },
  { Icon: Stethoscope, backgroundColor: '#F1F5F9', color: '#334155', borderColor: '#CBD5E1' },
];

const suggestionGroupMeta = {
  specialites: { label: 'Spécialités', Icon: Stethoscope },
  medecins: { label: 'Médecins', Icon: UserRound },
  symptomes: { label: 'Symptômes', Icon: Sparkles },
};

const availabilityFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const formatAvailabilityLabel = (dateIso) => {
  if (!dateIso) {
    return { text: 'Prochain: non renseigné', isSoon: false };
  }

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return { text: 'Prochain: non renseigné', isSoon: false };
  }

  const diffDays = (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  const label = availabilityFormatter.format(date);

  if (diffDays <= 7) {
    return { text: `Prochain dispo : ${label}`, isSoon: true };
  }

  return { text: `Prochain: ${label}`, isSoon: false };
};

const resolveSuggestionImageUrl = (value) => {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const base = api.defaults.baseURL.endsWith('/') ? api.defaults.baseURL : `${api.defaults.baseURL}/`;
  const path = value.startsWith('/') ? value.slice(1) : value;

  try {
    return new URL(path, base).toString();
  } catch {
    return undefined;
  }
};

function getStatIcon(label) {
  return statIconMap[label] || UsersRound;
}

function CountUpStat({ value, label, suffix, active }) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = Number(value) || 0;
  const Icon = getStatIcon(label);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    let frameId = 0;
    const duration = 1500;
    const start = performance.now();

    const animate = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(numericValue * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [active, numericValue]);

  return (
    <div className="flex items-center gap-4 px-5 py-5 md:px-6">
      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-med-primary/10 text-med-primary">
        <Icon size={20} />
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
          {displayValue.toLocaleString('fr-FR')}
          {suffix || ''}
        </p>
        <p className="text-sm text-slate-600">{label}</p>
      </div>
    </div>
  );
}

function RevealStepCard({ index, title, description }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`relative z-10 rounded-[24px] border border-slate-200 bg-white/95 p-5 shadow-sm transition-all duration-700 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-[30px] opacity-0'
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A6B8A] text-sm font-bold text-white shadow-lg shadow-[#1A6B8A]/20">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="mt-4 space-y-1">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function TestimonialsCarousel({ testimonials }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex >= testimonials.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, testimonials.length]);

  if (!testimonials.length) {
    return (
      <Card className="rounded-[28px] border border-slate-200 bg-white/95 p-6 text-slate-600 shadow-sm">
        Aucun avis patient n’est encore disponible.
      </Card>
    );
  }

  const goTo = (nextIndex) => {
    const total = testimonials.length;
    setCurrentIndex((nextIndex + total) % total);
  };

  return (
    <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-sm md:p-5">
      <div className="overflow-hidden rounded-[24px]">
        <motion.div
          className="flex"
          animate={{ x: `-${currentIndex * (100 / testimonials.length)}%` }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          style={{ width: `${testimonials.length * 100}%` }}
        >
          {testimonials.map((testimonial) => (
            <div
              key={`${testimonial.name}-${testimonial.doctorName}`}
              className="shrink-0 p-1 md:p-2"
              style={{ width: `${100 / testimonials.length}%` }}
            >
              <Card className="h-full rounded-[24px] border-l-[3px] border-l-[#1A6B8A] bg-white p-5 shadow-sm md:p-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ring-4 ring-[#1A6B8A]/10"
                    style={{ backgroundColor: testimonial.avatarColor }}
                  >
                    {testimonial.avatarInitials || 'TC'}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{testimonial.name}</p>
                        <p className="text-sm text-slate-500">{testimonial.city}</p>
                      </div>
                      <p className="text-xs text-slate-500">{testimonial.dateLabel}</p>
                    </div>
                    <p className="text-base leading-relaxed text-slate-700 md:text-lg">“{testimonial.quote}”</p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <div className="flex items-center gap-1" aria-label={`Note ${testimonial.rating} sur 5`}>
                        {Array.from({ length: 5 }).map((_, starIndex) => {
                          const filled = starIndex < Number(testimonial.rating || 0);

                          return (
                            <Star
                              key={`${testimonial.name}-star-${starIndex + 1}`}
                              size={16}
                              className={filled ? 'fill-[#F4A62A] text-[#F4A62A]' : 'text-slate-200'}
                            />
                          );
                        })}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{testimonial.doctorName}</p>
                        <p className="text-xs text-slate-500">{testimonial.specialtyLabel}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          className="h-11 w-11 rounded-full p-0"
          onClick={() => goTo(currentIndex - 1)}
          aria-label="Avis précédent"
        >
          <ChevronLeft size={18} />
        </Button>

        <div className="flex items-center gap-2">
          {testimonials.map((testimonial, index) => (
            <button
              key={`${testimonial.name}-${testimonial.doctorName}-dot`}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`h-2.5 rounded-full transition-all ${index === currentIndex ? 'w-8 bg-[#1A6B8A]' : 'w-2.5 bg-slate-300'}`}
              aria-label={`Aller au témoignage ${index + 1}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          className="h-11 w-11 rounded-full p-0"
          onClick={() => goTo(currentIndex + 1)}
          aria-label="Avis suivant"
        >
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % searchPlaceholders.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!statsRef.current || typeof IntersectionObserver === 'undefined') {
      setStatsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(statsRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const homeQuery = useQuery({
    queryKey: ['home-summary'],
    staleTime: 0,
    retry: 1,
    queryFn: async () => {
      const response = await api.get('/home/summary');
      const payload = response.data?.data;

      if (!payload || Array.isArray(payload)) {
        return fallbackHomeData;
      }

      return payload;
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(homeSearchSchema),
    defaultValues: {
      query: '',
      ville: '',
    },
  });

  const queryValue = watch('query') || '';
  const villeValue = watch('ville') || '';
  const trimmedQuery = String(queryValue).trim();

  const [suggestions, setSuggestions] = useState({
    specialites: [],
    medecins: [],
    symptomes: [],
  });
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const allowSuggestionsRef = useRef(true);

  const suggestionRows = useMemo(() => {
    let index = 0;
    const mapRows = (type, items) =>
      (items || []).map((item) => {
        const row = {
          index,
          id: `home-suggestion-${index}`,
          type,
          data: item,
        };
        index += 1;
        return row;
      });

    const specialites = mapRows('specialite', suggestions.specialites);
    const medecins = mapRows('medecin', suggestions.medecins);
    const symptomes = mapRows('symptome', suggestions.symptomes);
    const all = {
      index,
      id: `home-suggestion-${index}`,
      type: 'all',
      data: { query: trimmedQuery, ville: villeValue },
    };

    return {
      specialites,
      medecins,
      symptomes,
      all,
      total: index + 1,
    };
  }, [suggestions, trimmedQuery, villeValue]);

  const flatSuggestionRows = useMemo(
    () => [
      ...suggestionRows.specialites,
      ...suggestionRows.medecins,
      ...suggestionRows.symptomes,
      suggestionRows.all,
    ],
    [suggestionRows]
  );

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setSuggestions({ specialites: [], medecins: [], symptomes: [] });
      setSuggestionsLoading(false);
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      return undefined;
    }

    setSuggestionsLoading(true);
    const timeoutId = window.setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await api.get('/search/suggestions', {
          params: {
            q: trimmedQuery,
            ville: villeValue || undefined,
          },
          signal: controller.signal,
        });

        const payload = response.data?.data || response.data || {};
        setSuggestions({
          specialites: Array.isArray(payload.specialites) ? payload.specialites : [],
          medecins: Array.isArray(payload.medecins) ? payload.medecins : [],
          symptomes: Array.isArray(payload.symptomes) ? payload.symptomes : [],
        });
        if (allowSuggestionsRef.current) {
          setSuggestionsOpen(true);
        }
        setActiveSuggestionIndex(-1);
      } catch (error) {
        if (error?.code === 'ERR_CANCELED') {
          return;
        }
        console.error('Erreur suggestions recherche:', error);
        setSuggestions({ specialites: [], medecins: [], symptomes: [] });
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [trimmedQuery, villeValue]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!searchContainerRef.current) {
        return;
      }
      if (searchContainerRef.current.contains(event.target)) {
        return;
      }
      allowSuggestionsRef.current = false;
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const onSearchSubmit = (values) => {
    const params = new URLSearchParams();
    params.set('q', values.query);
    params.set('ville', values.ville);
    navigate(`/search?${params.toString()}`);
  };

  const handleSuggestionSelect = (row) => {
    if (!row) {
      return;
    }

    allowSuggestionsRef.current = false;
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);

    if (row.type === 'medecin') {
      navigate(`/doctor/${row.data.id}`);
      return;
    }

    if (row.type === 'specialite') {
      const params = new URLSearchParams();
      params.set('specialite', row.data.nom);
      if (villeValue) {
        params.set('ville', villeValue);
      }
      navigate(`/search?${params.toString()}`);
      return;
    }

    if (row.type === 'symptome') {
      const params = new URLSearchParams();
      params.set('specialite', row.data.specialite);
      navigate(`/search?${params.toString()}`);
      return;
    }

    if (row.type === 'all') {
      const params = new URLSearchParams();
      params.set('q', trimmedQuery);
      if (villeValue) {
        params.set('ville', villeValue);
      }
      navigate(`/search?${params.toString()}`);
    }
  };

  const handleQueryKeyDown = (event) => {
    if (!suggestionsOpen || trimmedQuery.length < 2) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestionIndex((current) => {
        const next = current + 1;
        return next >= flatSuggestionRows.length ? 0 : next;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestionIndex((current) => {
        const next = current - 1;
        return next < 0 ? flatSuggestionRows.length - 1 : next;
      });
      return;
    }

    if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
      event.preventDefault();
      handleSuggestionSelect(flatSuggestionRows[activeSuggestionIndex]);
      return;
    }

    if (event.key === 'Escape') {
      allowSuggestionsRef.current = false;
      setSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    }
  };

  if (homeQuery.isLoading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-xl shadow-med-primary/10 backdrop-blur md:p-8">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-4/5" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-[320px] rounded-[16px]" />
        </div>
        <Skeleton className="h-28 rounded-[28px]" />
        <Skeleton className="h-64 rounded-[28px]" />
        <Skeleton className="h-[380px] rounded-[28px]" />
        <Skeleton className="h-64 rounded-[28px]" />
      </div>
    );
  }

  if (homeQuery.isError || !homeQuery.data) {
    return (
      <Card className="space-y-4 border-red-200 bg-red-50/70">
        <Badge variant="warning">Accueil indisponible</Badge>
        <h1 className="text-2xl font-bold text-red-900">Le contenu de l accueil ne peut pas être chargé</h1>
        <p className="text-sm text-red-800">
          La plateforme est bien connectée au backend, mais les données d accueil ne sont pas disponibles pour le moment.
        </p>
        <Button variant="outline" onClick={() => homeQuery.refetch()}>
          Réessayer
        </Button>
      </Card>
    );
  }

  const home = homeQuery.data || fallbackHomeData;
  const stats = Array.isArray(home.stats) ? home.stats : [];
  const specialties = Array.isArray(home.specialties) ? home.specialties : [];
  const hotspots = Array.isArray(home.hotspots) ? home.hotspots : [];
  const testimonials = Array.isArray(home.testimonials) ? home.testimonials : [];
  const homeOverview = home.overview || {};
  const verifiedDoctorsCount = Number(
    homeOverview.verifiedDoctorsCount ?? stats.find((item) => item.label === 'Medecins verifies')?.value ?? 0
  );
  const citiesCount = Number(
    homeOverview.citiesCount ?? new Set(hotspots.map((hotspot) => hotspot.ville).filter(Boolean)).size
  );
  const homeCities = Array.isArray(home.cities) ? home.cities : [];
  const cityOptions = homeCities.length
    ? homeCities
    : Array.from(new Set(hotspots.map((spot) => spot.ville).filter(Boolean)));
  const formatHotspotLabel = (label) => {
    const text = String(label || '').trim();

    if (!text) {
      return '';
    }

    if (text.includes('/')) {
      return text
        .split(' / ')
        .map((segment) => formatSpecialtyLabel(segment))
        .join(' / ');
    }

    return formatFrenchLabel(text);
  };

  const formattedHotspots = hotspots.map((hotspot) => ({
    ...hotspot,
    label: formatHotspotLabel(hotspot.label),
  }));
  const testimonialCards = testimonials.map((testimonial) => ({
    ...testimonial,
    specialtyLabel: formatSpecialtyLabel(testimonial.specialty),
    avatarInitials: getInitials(testimonial.name),
    avatarColor: hashColor(testimonial.name),
    dateLabel: formatReviewDate(testimonial.dateIso || testimonial.date, testimonial.date),
  }));
  const heroPills = [
    { label: 'Médecins vérifiés', Icon: ShieldCheck },
    { label: 'Réservation rapide', Icon: CalendarDays },
    { label: 'Expérience premium', Icon: Sparkles },
  ];
  const queryField = register('query');
  const villeField = register('ville');
  const activeSuggestionId =
    activeSuggestionIndex >= 0 ? flatSuggestionRows[activeSuggestionIndex]?.id : undefined;
  const hasSuggestions =
    suggestions.specialites.length > 0 ||
    suggestions.medecins.length > 0 ||
    suggestions.symptomes.length > 0;
  const showDropdown = suggestionsOpen && trimmedQuery.length >= 2;

  const specialtyCarouselItems = specialties.length ? [...specialties, ...specialties] : [];

  const howItWorksSteps = [
    {
      title: 'Rechercher',
      description: 'Trouvez un médecin ou une spécialité à partir des données actuelles de la base.',
    },
    {
      title: 'Comparer',
      description: 'Consultez les profils, tarifs, avis et disponibilités réelles avant de réserver.',
    },
    {
      title: 'Réserver',
      description: 'Confirmez un rendez-vous et suivez son état directement depuis votre espace.',
    },
  ];

  return (
    <div className="flex min-h-0 flex-col gap-8 md:gap-10">
      <MotionSection
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative overflow-visible rounded-[40px] bg-white shadow-2xl shadow-slate-200/50"
      >
        <div className="flex flex-col lg:flex-row">
          {/* Left Content */}
          <div className="flex flex-1 flex-col justify-center p-8 md:p-12 lg:p-16">
            <div className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#1A6B8A]">
              <ShieldCheck size={16} className="text-[#1A6B8A]" />
              Plateforme Certifiée
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-slate-900 md:text-7xl">
                Trouvez votre <br />
                <span className="bg-gradient-to-r from-[#1A6B8A] to-[#2ecc71] bg-clip-text text-transparent">médecin</span> <br />
                au Maroc
              </h1>
              <p className="max-w-md text-base leading-relaxed text-slate-500 md:text-lg">
                Des milliers de médecins vérifiés. Prenez rendez-vous en ligne, en cabinet ou en téléconsultation.
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSearchSubmit)}
              className="mt-10 space-y-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div ref={searchContainerRef} className="relative flex-1 min-w-[280px]">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    {...queryField}
                    value={queryValue}
                    onChange={(event) => {
                      queryField.onChange(event);
                      allowSuggestionsRef.current = true;
                      const nextValue = event.target.value;
                      if (nextValue.trim().length >= 2) {
                        setSuggestionsOpen(true);
                      } else {
                        setSuggestionsOpen(false);
                      }
                      setActiveSuggestionIndex(-1);
                    }}
                    onFocus={() => {
                      allowSuggestionsRef.current = true;
                      if (trimmedQuery.length >= 2) {
                        setSuggestionsOpen(true);
                      }
                    }}
                    onKeyDown={handleQueryKeyDown}
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-controls="home-search-suggestions"
                    aria-activedescendant={activeSuggestionId}
                    autoComplete="off"
                    className="h-[58px] w-full rounded-2xl border border-slate-100 bg-slate-50/50 pl-12 pr-4 text-base focus:border-[#1A6B8A] focus:outline-none focus:ring-4 focus:ring-[#1A6B8A]/10 placeholder:text-slate-400"
                    placeholder="Symptôme ou spécialité..."
                  />
                  {errors.query && <p className="mt-1 text-xs text-red-500">{errors.query.message}</p>}

                  {showDropdown ? (
                    <div
                      id="home-search-suggestions"
                      role="listbox"
                      className="absolute left-0 top-[calc(100%+8px)] z-[999] w-full max-h-[480px] overflow-y-auto rounded-2xl border border-[#eef0f3] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.14)]"
                      style={{ animation: 'fadeSlideDown 0.15s ease' }}
                    >
                      {suggestionsLoading ? (
                        <div className="space-y-3 p-4">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div key={`skeleton-${index}`} className="space-y-2">
                              <Skeleton className="h-4 w-2/3 rounded-lg" />
                              <Skeleton className="h-3 w-1/2 rounded-lg" />
                            </div>
                          ))}
                        </div>
                      ) : hasSuggestions ? (
                        <div>
                          {suggestionRows.specialites.length > 0 ? (
                            <div>
                              <div className="flex items-center gap-2 border-b border-[#F3F4F6] bg-[#FAFAFA] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-400">
                                <suggestionGroupMeta.specialites.Icon size={13} />
                                {suggestionGroupMeta.specialites.label}
                              </div>
                              {suggestionRows.specialites.map((row) => {
                                const meta = getSpecialtyDisplayMeta(row.data.nom);
                                const Icon = meta.Icon;
                                const isActive = row.index === activeSuggestionIndex;
                                const cityLabel = row.data.villes?.length
                                  ? row.data.villes[0]
                                  : villeValue || 'Maroc';

                                return (
                                  <button
                                    key={row.id}
                                    id={row.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isActive}
                                    onMouseEnter={() => setActiveSuggestionIndex(row.index)}
                                    onClick={() => handleSuggestionSelect(row)}
                                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                                      isActive ? 'bg-[#F0F7FA]' : 'hover:bg-[#F0F7FA]'
                                    }`}
                                  >
                                    <span
                                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70"
                                      style={{ backgroundColor: meta.backgroundColor, color: meta.color }}
                                    >
                                      <Icon size={16} />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block text-sm font-medium text-[#0F1923]">
                                        {formatSpecialtyLabel(row.data.nom)}
                                      </span>
                                      <span className="block text-xs text-slate-500">
                                        {row.data.count} médecins · {cityLabel}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}

                          {suggestionRows.medecins.length > 0 ? (
                            <div>
                              <div className="flex items-center gap-2 border-y border-[#F3F4F6] bg-[#FAFAFA] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-400">
                                <suggestionGroupMeta.medecins.Icon size={13} />
                                {suggestionGroupMeta.medecins.label}
                              </div>
                              {suggestionRows.medecins.map((row) => {
                                const isActive = row.index === activeSuggestionIndex;
                                const initials = getInitials(row.data.nom);
                                const availability = formatAvailabilityLabel(row.data.prochainDispo);
                                const avatarUrl = resolveSuggestionImageUrl(row.data.profilePhotoUrl);
                                return (
                                  <button
                                    key={row.id}
                                    id={row.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isActive}
                                    onMouseEnter={() => setActiveSuggestionIndex(row.index)}
                                    onClick={() => handleSuggestionSelect(row)}
                                    className={`flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
                                      isActive
                                        ? 'border-[#1A6B8A] bg-[#F8FBFC]'
                                        : 'border-transparent hover:border-[#1A6B8A] hover:bg-[#F8FBFC]'
                                    }`}
                                  >
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={row.data.nom}
                                        className="h-10 w-10 rounded-full object-cover ring-2 ring-[#1A6B8A]/15"
                                        loading="lazy"
                                        decoding="async"
                                      />
                                    ) : (
                                      <span
                                        className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                                        style={{ backgroundColor: hashColor(row.data.nom) }}
                                      >
                                        {initials || 'DR'}
                                      </span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-medium text-slate-900">
                                        {row.data.nom}
                                      </span>
                                      <span className="mt-0.5 block text-xs text-slate-500">
                                        {row.data.specialite} · {row.data.ville || 'Maroc'} · ⭐ {Number(row.data.note || 0).toFixed(1)} ·{' '}
                                        {Number(row.data.tarif || 0).toLocaleString('fr-FR')} MAD
                                      </span>
                                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                        <span>{availability.text}</span>
                                        {availability.isSoon ? (
                                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                            Dispo cette semaine
                                          </span>
                                        ) : null}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}

                          {suggestionRows.symptomes.length > 0 ? (
                            <div>
                              <div className="flex items-center gap-2 border-y border-[#F3F4F6] bg-[#FAFAFA] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-400">
                                <suggestionGroupMeta.symptomes.Icon size={13} />
                                {suggestionGroupMeta.symptomes.label}
                              </div>
                              {suggestionRows.symptomes.map((row) => {
                                const isActive = row.index === activeSuggestionIndex;
                                return (
                                  <button
                                    key={row.id}
                                    id={row.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isActive}
                                    onMouseEnter={() => setActiveSuggestionIndex(row.index)}
                                    onClick={() => handleSuggestionSelect(row)}
                                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                                      isActive ? 'bg-[#F0F7FA]' : 'hover:bg-[#F0F7FA]'
                                    }`}
                                  >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F6] text-sm">
                                      💊
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-semibold text-slate-900">
                                        {row.data.symptome}
                                      </span>
                                      <span className="block text-xs text-[#1A6B8A]">
                                        → {row.data.specialite} recommandé
                                      </span>
                                    </span>
                                    <span className="mt-0.5 rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-semibold text-[#7C3AED]">
                                      Correspondance automatique
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 px-6 py-6 text-center">
                          <div className="text-4xl">🔍</div>
                          <p className="text-sm font-semibold text-slate-800">
                            Aucun résultat pour "{trimmedQuery}"
                          </p>
                          <p className="text-xs text-slate-500">
                            Essayez un symptôme comme "mal de tête" ou "douleur dos"
                          </p>
                          <button
                            type="button"
                            onClick={() => handleSuggestionSelect(suggestionRows.all)}
                            className="mt-2 rounded-full bg-[#1A6B8A] px-4 py-1.5 text-xs font-semibold text-white"
                          >
                            Voir tous les médecins →
                          </button>
                        </div>
                      )}

                      <div className="sticky bottom-0 border-t border-[#F3F4F6] bg-[#F8FBFC] px-4 py-2">
                        <button
                          type="button"
                          id={suggestionRows.all.id}
                          role="option"
                          aria-selected={suggestionRows.all.index === activeSuggestionIndex}
                          onMouseEnter={() => setActiveSuggestionIndex(suggestionRows.all.index)}
                          onClick={() => handleSuggestionSelect(suggestionRows.all)}
                          className={`flex w-full items-center gap-2 text-left text-sm font-semibold text-[#1A6B8A] ${
                            suggestionRows.all.index === activeSuggestionIndex
                              ? 'rounded-lg bg-[#F0F7FA] px-2 py-1'
                              : ''
                          }`}
                        >
                          🔍 Voir tous les résultats pour "{trimmedQuery}"
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative w-full md:w-[200px]">
                  <select
                    {...villeField}
                    value={villeValue}
                    onChange={(event) => {
                      villeField.onChange(event);
                      allowSuggestionsRef.current = true;
                      setActiveSuggestionIndex(-1);
                      if (trimmedQuery.length >= 2) {
                        setSuggestionsOpen(true);
                      }
                    }}
                    className="h-[58px] w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50/50 px-4 pr-10 text-base focus:border-[#1A6B8A] focus:outline-none focus:ring-4 focus:ring-[#1A6B8A]/10"
                  >
                    <option value="" disabled>Toutes les villes</option>
                    {cityOptions.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <ChevronRight size={16} className="rotate-90" />
                  </div>
                  {errors.ville && <p className="mt-1 text-xs text-red-500">{errors.ville.message}</p>}
                </div>
              </div>

              <Button
                type="submit"
                className="h-[58px] gap-3 rounded-2xl bg-[#005c73] px-10 text-base font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Search size={20} />
                Rechercher un médecin
              </Button>
            </form>
          </div>

          {/* Right Image */}
          <div className="relative hidden w-full overflow-hidden rounded-r-[40px] bg-[#E5F6F6] lg:block lg:w-[45%]">
            <img
              src="/docs/screenshots/couverture_tabibconnect.jpeg"
              alt="TabibConnect - Votre plateforme de santé"
              className="h-full w-full object-cover object-center"
              loading="eager"
            />
          </div>

        </div>
      </MotionSection>


      <MotionSection
        ref={statsRef}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        className="grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-lg shadow-med-primary/10 md:grid-cols-4 md:divide-y-0"
      >
        {stats.map((item) => (
          <CountUpStat
            key={item.label}
            value={item.value}
            label={formatFrenchLabel(item.label)}
            suffix={item.suffix}
            active={statsVisible}
          />
        ))}
      </MotionSection>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge variant="info">Spécialités vérifiées en base</Badge>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Parcourir par spécialité</h2>
          </div>
          <p className="text-sm text-slate-600">{specialties.length} spécialités visibles sur la plateforme.</p>
        </div>

        {specialtyCarouselItems.length ? (
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-sm md:p-5">
            <div className="infinite-scroll-track flex w-max gap-4">
              {specialtyCarouselItems.map((specialty, index) => {
                const specialtyMeta = getSpecialtyDisplayMeta(specialty.label);
                const specialtyVisual = specialtyVisualPalette[index % specialtyVisualPalette.length];
                const Icon = specialtyVisual.Icon;

                return (
                  <div key={`${specialty.label}-${index}`} className="w-[250px] shrink-0 md:w-[280px]">
                    <div
                      className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ borderColor: specialtyVisual.borderColor }}
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/70"
                        style={{ backgroundColor: specialtyVisual.backgroundColor, color: specialtyVisual.color }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-[15px] font-semibold text-slate-900">{specialtyMeta.labelFr}</h3>
                        <p className="text-xs text-slate-500">{specialtyMeta.labelAr}</p>
                        <p className="text-sm text-slate-600">
                          {Number(specialty.count || 0).toLocaleString('fr-FR')} médecins actifs dans la base
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="rounded-[28px] border border-slate-200 bg-white/95 p-5 text-slate-600 shadow-sm">
            Aucune spécialité n’est encore disponible.
          </Card>
        )}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 shadow-lg shadow-slate-900/5">
        <div className="relative h-[200px] w-full">
          <img
            src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=1400"
            alt="Salle de consultation moderne"
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-[rgba(26,107,138,0.75)]" />
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-white">
            <p className="max-w-3xl text-2xl font-bold leading-tight md:text-3xl">
              Plus de {verifiedDoctorsCount.toLocaleString('fr-FR')} médecins vérifiés dans {citiesCount.toLocaleString('fr-FR')} ville
              {citiesCount > 1 ? 's' : ''} du Maroc
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge variant="info">Comment ça marche</Badge>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Trois étapes pour réserver</h2>
          </div>
          <p className="text-sm text-slate-600">Un parcours simple, rapide et basé sur les données réelles de la base.</p>
        </div>

        <div className="how-it-works-track relative grid gap-4 md:grid-cols-3">
          {howItWorksSteps.map((step, index) => (
            <RevealStepCard key={step.title} index={index} title={step.title} description={step.description} />
          ))}
        </div>
      </section>

      <MotionSection
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        className="space-y-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge variant="info">Carte du Maroc</Badge>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Cabinets réels sur la carte</h2>
          </div>
          <p className="text-sm text-slate-600">Les marqueurs proviennent des cabinets géolocalisés en base.</p>
        </div>

        <MotionCard className="space-y-4 rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-sm" interactive={false}>
          <Suspense fallback={<Skeleton className="h-[380px] rounded-[16px]" />}>
            <HomeCabinetMap />
          </Suspense>
        </MotionCard>
      </MotionSection>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge variant="info">Villes actives</Badge>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Villes les plus actives</h2>
          </div>
          <p className="text-sm text-slate-600">Les points chauds sont dérivés des cabinets et médecins enregistrés.</p>
        </div>

        <motion.div 
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {formattedHotspots.map((hotspot) => (
            <motion.div
              key={hotspot.ville}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 }
              }}
            >
              <Link
                to={`/search?ville=${encodeURIComponent(hotspot.ville)}`}
                className="group block h-full"
              >
                <Card className="relative h-full overflow-hidden space-y-4 rounded-[32px] border border-slate-200 bg-white/95 p-7 shadow-sm transition-all duration-300 group-hover:border-med-primary group-hover:shadow-xl group-hover:shadow-med-primary/5">
                  <span className="pointer-events-none absolute -right-4 -top-4 select-none text-[8rem] font-black leading-none text-slate-900 opacity-[0.03] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:opacity-[0.05]">
                    {hotspot.ville?.charAt(0)?.toUpperCase() || 'M'}
                  </span>
                  
                  <div className="relative flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-med-primary transition-colors">
                          {hotspot.ville}
                        </h3>
                        <div className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-med-primary opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-med-primary"></span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-500">
                        {hotspot.label || 'Cabinets médicaux actifs'}
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-4 flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-slate-900">{hotspot.doctorsCount}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Médecins</span>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-slate-900">{hotspot.cabinetsCount}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cabinets</span>
                    </div>
                    <div className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-med-primary group-hover:text-white">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <UserRound className="text-med-secondary" />
          <div>
            <Badge variant="info">Avis réels</Badge>
            <h2 className="text-xl font-bold text-slate-900">Avis patients</h2>
            <p className="text-sm text-slate-600">Les témoignages affichés proviennent des avis persistés en base.</p>
          </div>
        </div>

        <TestimonialsCarousel testimonials={testimonialCards} />
      </section>
    </div>
  );
}

export default HomePage;
