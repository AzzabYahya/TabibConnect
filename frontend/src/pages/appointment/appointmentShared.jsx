import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  MapPin,
  Pill,
  Tag,
  Timer,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const STATUS_LABELS = {
  EN_ATTENTE: 'En attente',
  CONFIRME: 'Confirmé',
  COMPLETE: 'Terminé',
  ANNULE: 'Annulé',
  NO_SHOW: 'Absent',
};

export const STATUS_BADGE_CLASS = {
  EN_ATTENTE: 'bg-amber-100 text-amber-900',
  CONFIRME: 'bg-teal-100 text-teal-900',
  COMPLETE: 'bg-green-100 text-green-900',
  ANNULE: 'bg-red-100 text-red-900',
  NO_SHOW: 'bg-slate-200 text-slate-700',
};

export const PATIENT_HEADER_GRADIENT = {
  EN_ATTENTE: 'from-amber-50 to-white',
  CONFIRME: 'from-[#E8F4F8] to-white',
  ANNULE: 'from-red-50 to-white',
  COMPLETE: 'from-green-50 to-white',
  NO_SHOW: 'from-slate-100 to-white',
};

export function AppointmentStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-semibold ${STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.NO_SHOW}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function AppointmentMetaLine({ appointment, language = 'fr' }) {
  const dateLabel = format(new Date(appointment.dateTime), 'PPPP', {
    locale: language === 'ar' ? fr : fr,
  });
  const timeLabel = format(new Date(appointment.dateTime), 'HH:mm', { locale: fr });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays size={15} className="text-med-primary" />
        {dateLabel}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock3 size={15} className="text-med-primary" />
        {timeLabel}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Timer size={15} className="text-med-primary" />
        {appointment.durationMinutes || 30} min
      </span>
      {appointment.cabinet ? (
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={15} className="text-med-primary" />
          {appointment.cabinet.name} — {appointment.cabinet.city}
        </span>
      ) : null}
    </div>
  );
}

export function AppointmentReferenceLine({ appointment, reference }) {
  return (
    <p className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1">
        <Tag size={13} />
        Réf: {reference}
      </span>
      <span className="inline-flex items-center gap-1">
        <Pill size={13} />
        Motif: {appointment.reason}
      </span>
    </p>
  );
}

export function getInitials(value = '') {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function getPreparationTips(motif = '') {
  const normalized = String(motif).toLowerCase();
  if (normalized.includes('bilan')) {
    return [
      'Être à jeun si un bilan sanguin est prévu',
      'Apporter vos dernières analyses médicales',
      'Lister vos traitements en cours',
    ];
  }
  if (normalized.includes('douleur')) {
    return [
      'Noter depuis quand la douleur est présente',
      'Apporter vos ordonnances et traitements actuels',
      'Préparer une description précise des symptômes',
    ];
  }
  return [
    'Arriver 10 minutes en avance',
    'Apporter votre CIN et carte d assurance',
    'Lister vos médicaments actuels',
  ];
}

export function antecedentPillClass(label = '') {
  const value = label.toLowerCase();
  if (value.includes('allerg')) return 'bg-red-100 text-red-800';
  if (value.includes('diab')) return 'bg-amber-100 text-amber-900';
  if (value.includes('hyper')) return 'bg-orange-100 text-orange-900';
  return 'bg-slate-100 text-slate-700';
}

export function canCancelBeforeDeadline(appointment) {
  const hours = appointment.freeCancellationHours ?? 2;
  const diffMs = new Date(appointment.dateTime).getTime() - Date.now();
  return diffMs > hours * 60 * 60 * 1000;
}

export function isFutureAppointment(appointment) {
  return new Date(appointment.dateTime).getTime() > Date.now();
}

export function WarningsCard({ count }) {
  if (!count) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-[#FEF3C7] p-5">
      <div className="flex gap-3">
        <AlertTriangle size={24} className="shrink-0 text-amber-600" />
        <div className="space-y-1">
          <h3 className="font-semibold text-amber-950">Avertissements patient</h3>
          <p className="text-sm text-amber-900">
            Ce patient a {count} avertissement(s) : absences non justifiées ou annulations tardives.
          </p>
          <p className="text-xs text-slate-600">
            Les médecins voient cet indicateur avant confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SectionCard({ title, icon: Icon, badge, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {Icon ? <Icon size={18} className="text-med-primary" /> : null}
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

export function SavedIndicator({ saved }) {
  if (!saved) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700">
      <Check size={14} />
      Sauvegardé
    </span>
  );
}

export function NotesIcon() {
  return <FileText size={18} className="text-med-primary" />;
}
