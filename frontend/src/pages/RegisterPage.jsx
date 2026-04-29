import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Stethoscope, Upload, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import api from '../lib/api';
import {
  createRedirectSearch,
  dashboardRouteByRole,
  getCurrentSession,
  normalizeRedirectPath,
} from '../lib/auth';
import { MOROCCO_CITY_SELECT_OPTIONS } from '../lib/moroccoCities';
import { storeCsrfToken, storeSession } from '../lib/session';

const patientSchema = z.object({
  email: z.string().email('Email invalide'),
  phone: z.string().regex(/^\+212[0-9]{9}$/, 'Numéro marocain attendu (+212...)'),
  password: z.string().min(8, 'Minimum 8 caractères').regex(/[A-Z]/, 'Au moins une majuscule').regex(/[0-9]/, 'Au moins un chiffre'),
  cin: z.string().min(4, 'CIN requis'),
  dateOfNaissance: z.string().min(1, 'Date de naissance requise'),
  sexe: z.enum(['HOMME', 'FEMME']),
  adresse: z.string().min(5, 'Adresse requise'),
  ville: z.string().min(2, 'Ville requise'),
  groupeSanguin: z.string().optional(),
  antecedents: z.string().optional(),
  cinDocument: z.any().refine((files) => files && files.length > 0, 'La carte d identité nationale est obligatoire'),
});

const doctorSchema = z.object({
  email: z.string().email('Email invalide'),
  phone: z.string().regex(/^\+212[0-9]{9}$/, 'Numéro marocain attendu (+212...)'),
  password: z.string().min(8, 'Minimum 8 caractères').regex(/[A-Z]/, 'Au moins une majuscule').regex(/[0-9]/, 'Au moins un chiffre'),
  inpe: z.string().min(4, 'INPE requis'),
  specialite: z.string().min(3, 'Spécialité requise'),
  languesParlees: z.array(z.string()).min(1, 'Sélectionnez au moins une langue'),
  tarifConsultation: z.coerce.number().min(100).max(2000),
  accepteAssurance: z.boolean().default(false),
  diplomes: z.string().min(2, 'Décrivez vos diplômes ou formations'),
  bio: z.string().max(2000).optional(),
  experience: z.coerce.number().min(0).max(80),
  documents: z.any().refine((files) => files && files.length > 0, 'Ajoutez au moins un document de vérification'),
  cinDocument: z.any().refine((files) => files && files.length > 0, 'La carte d identité nationale est obligatoire'),
});

const patientStepOneFields = ['email', 'password', 'phone', 'cin', 'cinDocument'];
const doctorStepOneFields = ['email', 'password', 'phone'];
const doctorStepTwoFields = ['inpe', 'specialite', 'languesParlees', 'tarifConsultation', 'accepteAssurance'];

const patientBadge = {
  icon: UserRound,
  label: 'Je suis un patient',
  description: 'Trouvez un médecin et prenez RDV en quelques clics.',
  badge: 'Inscription immédiate',
};

const doctorBadge = {
  icon: Stethoscope,
  label: 'Je suis médecin',
  description: 'Gérez vos consultations et développez votre patientèle.',
  badge: 'Validation INPE requise (24-48h)',
};

const specialtyOptions = [
  'Médecine générale',
  'Cardiologie',
  'Dermatologie',
  'Neurologie',
  'Pédiatrie',
  'Orthopédie',
  'Gynécologie',
  'ORL',
  'Ophtalmologie',
  'Pneumologie',
];

const languageOptions = ['Français', 'Arabe', 'Darija', 'Anglais'];

function StepPill({ current, total }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <span className="font-semibold text-slate-900">Étape {current}/{total}</span>
      <div className="flex flex-1 items-center gap-2">
        {Array.from({ length: total }).map((_, index) => (
          <span
            key={`step-${index + 1}`}
            className={`h-2 flex-1 rounded-full ${index < current ? 'bg-[#1A6B8A]' : 'bg-slate-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

function ChoiceCard({ icon, label, description, badge, tone = 'patient', onClick }) {
  const IconComponent = icon;
  const borderTone = tone === 'doctor' ? 'border-orange-200 hover:border-[#1A6B8A]' : 'border-emerald-200 hover:border-[#1A6B8A]';
  const badgeVariant = tone === 'doctor' ? 'warning' : 'success';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[28px] border bg-white/95 p-6 text-left shadow-lg shadow-slate-900/5 transition duration-200 hover:-translate-y-1 hover:shadow-xl ${borderTone}`}
    >
      <div className="absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A6B8A]/5 via-transparent to-transparent" />
      </div>
      <div className="relative space-y-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A6B8A]/10 text-[#1A6B8A]">
          {IconComponent ? <IconComponent size={34} /> : null}
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-900">{label}</h3>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <Badge variant={badgeVariant}>{badge}</Badge>
      </div>
    </button>
  );
}

function PatientRegisterWizard({ redirectPath, onBack }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(patientSchema),
    shouldUnregister: false,
    defaultValues: {
      email: '',
      phone: '+212',
      password: '',
      cin: '',
      dateOfNaissance: '',
      sexe: 'HOMME',
      adresse: '',
      ville: '',
      groupeSanguin: '',
      antecedents: '',
      cinDocument: undefined,
    },
  });

  const submitPatient = async (values) => {
    try {
      const csrfResponse = await api.get('/auth/csrf-token');
      storeCsrfToken(csrfResponse.data?.csrfToken || '');

      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('phone', values.phone);
      formData.append('password', values.password);
      formData.append('cin', values.cin);
      formData.append('dateOfNaissance', values.dateOfNaissance);
      formData.append('sexe', values.sexe);
      formData.append('adresse', values.adresse);
      formData.append('ville', values.ville);
      if (values.groupeSanguin) {
        formData.append('groupeSanguin', values.groupeSanguin);
      }
      if (values.antecedents) {
        formData.append('antecedents', values.antecedents);
      }
      if (values.cinDocument?.[0]) {
        formData.append('cinDocument', values.cinDocument[0]);
      }

      const response = await api.post('/auth/register/patient', formData);
      const data = response.data?.data || {};

      storeSession({ accessToken: data.accessToken, user: data.user });
      toast.success('Compte patient créé avec succès.');
      navigate(redirectPath || dashboardRouteByRole.PATIENT, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Erreur d’inscription');
    }
  };

  const goNext = async () => {
    const valid = await trigger(patientStepOneFields);

    if (valid) {
      setStep(2);
    }
  };

  return (
    <Card className="space-y-5 bg-white/95 p-6 shadow-xl shadow-slate-900/5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="success">Inscription patient</Badge>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Créer un compte patient</h2>
          <p className="text-sm text-slate-600">En deux étapes, avec accès direct aux rendez-vous.</p>
        </div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A6B8A]">
          <ArrowLeft size={16} /> Retour au choix
        </button>
      </div>

      <StepPill current={step} total={2} />

      <form onSubmit={handleSubmit(submitPatient)} className="space-y-5">
        {step === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="patient-email"
              type="email"
              label="Email"
              placeholder="sara@tabibconnect.ma"
              suggestions={['prenom.nom@tabibconnect.ma', 'youssef.benali@tabibconnect.ma']}
              helperText="Utilisez une adresse lisible pour votre espace patient."
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="patient-password"
              type="password"
              label="Mot de passe"
              placeholder="********"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              id="patient-phone"
              label="Téléphone"
              placeholder="+212612345678"
              suggestions={['+212612345678', '+212623456789', '+212634567891']}
              helperText="Format marocain attendu: +212 suivi de 9 chiffres."
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              id="patient-cin"
              label="CIN"
              placeholder="AB123456"
              error={errors.cin?.message}
              {...register('cin')}
            />
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="patient-cin-document" className="text-sm font-medium text-slate-700">Carte d identité nationale (obligatoire)</label>
              <input
                id="patient-cin-document"
                type="file"
                accept="application/pdf,image/*"
                className="w-full rounded-[10px] border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm focus:border-[#1A6B8A] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                {...register('cinDocument')}
              />
              {errors.cinDocument ? <p className="text-xs text-red-600">{errors.cinDocument.message}</p> : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="patient-dob"
              type="date"
              label="Date de naissance"
              error={errors.dateOfNaissance?.message}
              {...register('dateOfNaissance')}
            />
            <div className="space-y-1.5">
              <label htmlFor="patient-sex" className="text-sm font-medium text-slate-700">Sexe</label>
              <select
                id="patient-sex"
                className="h-12 w-full rounded-[10px] border border-slate-300 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-[#1A6B8A] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                {...register('sexe')}
              >
                <option value="HOMME">Homme</option>
                <option value="FEMME">Femme</option>
              </select>
              {errors.sexe ? <p className="text-xs text-red-600">{errors.sexe.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="patient-city" className="text-sm font-medium text-slate-700">Ville</label>
              <select
                id="patient-city"
                className="h-12 w-full rounded-[10px] border border-slate-300 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-[#1A6B8A] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                {...register('ville')}
              >
                <option value="">Sélectionner une ville (Maroc)</option>
                {MOROCCO_CITY_SELECT_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.ville ? <p className="text-xs text-red-600">{errors.ville.message}</p> : null}
            </div>
            <Input
              id="patient-address"
              label="Adresse"
              placeholder="Maarif Extension, Rue 12"
              error={errors.adresse?.message}
              containerClassName="md:col-span-2"
              {...register('adresse')}
            />
            <div className="space-y-1.5">
              <label htmlFor="patient-blood" className="text-sm font-medium text-slate-700">Groupe sanguin</label>
              <select
                id="patient-blood"
                className="h-12 w-full rounded-[10px] border border-slate-300 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-[#1A6B8A] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                {...register('groupeSanguin')}
              >
                <option value="">Optionnel</option>
                <option value="O_POS">O+</option>
                <option value="O_NEG">O-</option>
                <option value="A_POS">A+</option>
                <option value="A_NEG">A-</option>
                <option value="B_POS">B+</option>
                <option value="B_NEG">B-</option>
                <option value="AB_POS">AB+</option>
                <option value="AB_NEG">AB-</option>
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="patient-antecedents" className="text-sm font-medium text-slate-700">Antécédents</label>
              <textarea
                id="patient-antecedents"
                rows={4}
                className="w-full rounded-[10px] border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm focus:border-[#1A6B8A] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                placeholder="Allergies, maladies chroniques, notes utiles..."
                {...register('antecedents')}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {step === 1 ? (
            <Button type="button" className="h-[52px] gap-2 bg-[#1A6B8A] text-white hover:bg-[#15556d]" onClick={goNext}>
              Continuer <ArrowRight size={16} />
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" className="h-[52px] gap-2" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Retour
              </Button>
              <Button type="submit" className="h-[52px] gap-2 bg-[#1A6B8A] text-white hover:bg-[#15556d]" disabled={isSubmitting}>
                <CheckCircle2 size={16} /> Créer mon compte patient
              </Button>
            </>
          )}
        </div>
      </form>
    </Card>
  );
}

function DoctorRegisterWizard({ redirectPath, onBack }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(doctorSchema),
    shouldUnregister: false,
    defaultValues: {
      email: '',
      phone: '+212',
      password: '',
      inpe: '',
      specialite: 'Médecine générale',
      languesParlees: ['Français'],
      tarifConsultation: 300,
      accepteAssurance: false,
      diplomes: '',
      bio: '',
      experience: 1,
      documents: undefined,
      cinDocument: undefined,
    },
  });

  const tarifConsultation = useWatch({ control, name: 'tarifConsultation' });
  const selectedLanguages = useWatch({ control, name: 'languesParlees' }) || [];

  const submitDoctor = async (values) => {
    try {
      const csrfResponse = await api.get('/auth/csrf-token');
      storeCsrfToken(csrfResponse.data?.csrfToken || '');

      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('phone', values.phone);
      formData.append('password', values.password);
      formData.append('inpe', values.inpe);
      formData.append('specialite', values.specialite);
      formData.append('languesParlees', Array.isArray(values.languesParlees) ? values.languesParlees.join(',') : String(values.languesParlees || ''));
      formData.append('tarifConsultation', String(values.tarifConsultation));
      formData.append('accepteAssurance', values.accepteAssurance ? 'true' : 'false');
      formData.append('diplomes', values.diplomes);
      formData.append('bio', values.bio || '');
      formData.append('experience', String(values.experience));

      Array.from(values.documents || []).forEach((file) => {
        formData.append('documents', file);
      });
      if (values.cinDocument?.[0]) {
        formData.append('cinDocument', values.cinDocument[0]);
      }

      const response = await api.post('/auth/register/doctor', formData);
      const data = response.data?.data || {};

      storeSession({ accessToken: data.accessToken, user: data.user });
      toast.success('Dossier médecin envoyé. Vérification en cours.');
      navigate(redirectPath || dashboardRouteByRole.DOCTOR, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Erreur d’inscription');
    }
  };

  const goNext = async () => {
    const fields = step === 1 ? doctorStepOneFields : doctorStepTwoFields;
    const valid = await trigger(fields);

    if (valid) {
      setStep((current) => Math.min(current + 1, 3));
    }
  };

  const feeLabel = useMemo(() => `${Number(tarifConsultation || 0).toLocaleString('fr-MA')} MAD`, [tarifConsultation]);

  return (
    <Card className="space-y-5 bg-white/95 p-6 shadow-xl shadow-slate-900/5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="warning">Inscription médecin</Badge>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Créer un compte médecin</h2>
          <p className="text-sm text-slate-600">Validation INPE et contrôle administratif sous 24 à 48 heures.</p>
        </div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A6B8A]">
          <ArrowLeft size={16} /> Retour au choix
        </button>
      </div>

      <StepPill current={step} total={3} />

      <form onSubmit={handleSubmit(submitDoctor)} className="space-y-5">
        {step === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="doctor-email"
              type="email"
              label="Email"
              placeholder="dr.salma@tabibconnect.ma"
              suggestions={['dr.amine.fassi@tabibconnect.ma', 'dr.salma.alaoui@tabibconnect.ma', 'dr.nora.rachidi@tabibconnect.ma']}
              helperText="Les comptes médecins seront validés après vérification."
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="doctor-password"
              type="password"
              label="Mot de passe"
              placeholder="********"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              id="doctor-phone"
              label="Téléphone"
              placeholder="+212612345678"
              suggestions={['+212634567890', '+212645678901', '+212656789012']}
              helperText="Numéro direct pour la vérification administrative."
              error={errors.phone?.message}
              containerClassName="md:col-span-2"
              {...register('phone')}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="doctor-inpe"
              label="INPE"
              placeholder="INPE-2026-0001"
              error={errors.inpe?.message}
              {...register('inpe')}
            />
            <div className="space-y-1.5">
              <label htmlFor="doctor-specialite" className="text-sm font-medium text-slate-700">Spécialité</label>
              <select
                id="doctor-specialite"
                className="h-12 w-full rounded-[10px] border border-slate-300 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-[#1A6B8A] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                {...register('specialite')}
              >
                {specialtyOptions.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
              {errors.specialite ? <p className="text-xs text-red-600">{errors.specialite.message}</p> : null}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="doctor-languages" className="text-sm font-medium text-slate-700">Langues parlées</label>
              <div id="doctor-languages" className="grid gap-2 sm:grid-cols-2">
                {languageOptions.map((language) => (
                  <label
                    key={language}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                  >
                    <input
                      type="checkbox"
                      value={language}
                      className="h-4 w-4 accent-[#1A6B8A]"
                      {...register('languesParlees')}
                    />
                    <span>{language}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500">Cochez une ou plusieurs langues.</p>
              <p className="text-xs text-slate-500">Sélectionnées: {selectedLanguages.length ? selectedLanguages.join(', ') : 'Aucune'}</p>
              {errors.languesParlees ? <p className="text-xs text-red-600">{errors.languesParlees.message}</p> : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="doctor-fee" className="text-sm font-medium text-slate-700">Tarif consultation</label>
                <span className="text-sm font-semibold text-[#1A6B8A]">{feeLabel}</span>
              </div>
              <input
                id="doctor-fee"
                type="range"
                min={100}
                max={2000}
                step={50}
                className="w-full accent-[#1A6B8A]"
                {...register('tarifConsultation', { valueAsNumber: true })}
              />
              {errors.tarifConsultation ? <p className="text-xs text-red-600">{errors.tarifConsultation.message}</p> : null}
            </div>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Accepte les assurances</p>
                <p className="text-xs text-slate-500">CNSS, CNOPS et assurances privées.</p>
              </div>
              <span className="relative inline-flex items-center">
                <input type="checkbox" className="peer sr-only" {...register('accepteAssurance')} />
                <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-[#1A6B8A]" />
                <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </span>
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="doctor-cin-document" className="text-sm font-medium text-slate-700">Carte d identité nationale (obligatoire)</label>
              <input
                id="doctor-cin-document"
                type="file"
                accept="application/pdf,image/*"
                className="w-full rounded-[10px] border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm focus:border-[#1A6B8A] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                {...register('cinDocument')}
              />
              {errors.cinDocument ? <p className="text-xs text-red-600">{errors.cinDocument.message}</p> : null}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="doctor-documents" className="text-sm font-medium text-slate-700">Upload document INPE</label>
              <input
                id="doctor-documents"
                type="file"
                accept="application/pdf,image/*"
                multiple
                className="w-full rounded-[10px] border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm focus:border-[#1A6B8A] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                {...register('documents')}
              />
              <p className="text-xs text-slate-500">PDF ou image, jusqu’à 5 fichiers.</p>
              {errors.documents ? <p className="text-xs text-red-600">{errors.documents.message}</p> : null}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="doctor-diplomes" className="text-sm font-medium text-slate-700">Diplômes / formations</label>
              <textarea
                id="doctor-diplomes"
                rows={4}
                className="w-full rounded-[10px] border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm focus:border-[#1A6B8A] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                placeholder="Doctorat, spécialisation, formations complémentaires..."
                {...register('diplomes')}
              />
              {errors.diplomes ? <p className="text-xs text-red-600">{errors.diplomes.message}</p> : null}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="doctor-bio" className="text-sm font-medium text-slate-700">Bio</label>
              <textarea
                id="doctor-bio"
                rows={4}
                className="w-full rounded-[10px] border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm focus:border-[#1A6B8A] focus:outline-none focus:ring-2 focus:ring-[#1A6B8A]/30"
                placeholder="Décrivez votre approche, vos pratiques et votre valeur ajoutée."
                {...register('bio')}
              />
            </div>
            <Input
              id="doctor-experience"
              type="number"
              label="Années d'expérience"
              min={0}
              max={80}
              error={errors.experience?.message}
              {...register('experience', { valueAsNumber: true })}
            />
            <div className="flex items-end rounded-2xl bg-emerald-50/70 p-4 text-sm text-emerald-900">
              Votre dossier est en cours de vérification par notre équipe (24-48h).
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {step > 1 ? (
            <Button type="button" variant="outline" className="h-[52px] gap-2" onClick={() => setStep((current) => current - 1)}>
              <ArrowLeft size={16} /> Retour
            </Button>
          ) : null}

          {step < 3 ? (
            <Button type="button" className="h-[52px] gap-2 bg-[#1A6B8A] text-white hover:bg-[#15556d]" onClick={goNext}>
              Continuer <ArrowRight size={16} />
            </Button>
          ) : (
            <Button type="submit" className="h-[52px] gap-2 bg-[#1A6B8A] text-white hover:bg-[#15556d]" disabled={isSubmitting}>
              <Upload size={16} /> Envoyer mon dossier
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = normalizeRedirectPath(searchParams.get('redirect'));
  const [mode, setMode] = useState('choice');
  const session = getCurrentSession();

  useEffect(() => {
    if (!session.isAuthenticated) {
      return;
    }

    navigate(redirectPath || dashboardRouteByRole[session.role] || '/', { replace: true });
  }, [navigate, redirectPath, session.isAuthenticated, session.role]);

  const loginHref = `/connexion${createRedirectSearch(redirectPath)}`;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-white/85 shadow-2xl shadow-slate-900/10 backdrop-blur">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.06]">
        <img
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1400"
          alt="Hôpital moderne en arrière-plan"
          className="h-full w-full object-cover blur-2xl"
          loading="eager"
          decoding="async"
        />
      </div>

      <div className="space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="info">Créer un compte</Badge>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Rejoignez TabibConnect</h1>
            <p className="text-sm text-slate-600">Choisissez votre profil puis complétez le formulaire adapté.</p>
          </div>
          <Link to={loginHref} className="text-sm font-semibold text-[#1A6B8A] transition hover:text-[#15556d]">
            Déjà inscrit ? Se connecter
          </Link>
        </div>

        {mode === 'choice' ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ChoiceCard
              icon={patientBadge.icon}
              label={patientBadge.label}
              description={patientBadge.description}
              badge={patientBadge.badge}
              tone="patient"
              onClick={() => setMode('patient')}
            />
            <ChoiceCard
              icon={doctorBadge.icon}
              label={doctorBadge.label}
              description={doctorBadge.description}
              badge={doctorBadge.badge}
              tone="doctor"
              onClick={() => setMode('doctor')}
            />
          </div>
        ) : null}

        {mode === 'patient' ? <PatientRegisterWizard redirectPath={redirectPath} onBack={() => setMode('choice')} /> : null}
        {mode === 'doctor' ? <DoctorRegisterWizard redirectPath={redirectPath} onBack={() => setMode('choice')} /> : null}
      </div>
    </section>
  );
}

export default RegisterPage;
