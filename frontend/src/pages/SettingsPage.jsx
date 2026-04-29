import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut, Shield, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { z } from 'zod';

import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import MotionCard from '../components/ui/MotionCard';
import { dashboardRouteByRole, getCurrentSession } from '../lib/auth';
import { deleteCurrentUserAccount, logoutCurrentUser } from '../lib/accountActions';

const deletionReasons = [
  { value: 'PLUS_BESOIN', label: 'Je n’ai plus besoin de la plateforme' },
  { value: 'CONFIDENTIALITE', label: 'Préoccupations de confidentialité' },
  { value: 'TROP_COUTEUX', label: 'Le service est trop coûteux' },
  { value: 'AUTRE', label: 'Autre raison' },
];

const deletionSchema = z.object({
  reason: z.enum(['PLUS_BESOIN', 'CONFIDENTIALITE', 'TROP_COUTEUX', 'AUTRE']),
  reasonDetail: z.string().trim().max(500).optional(),
  acceptDeletionTerms: z
    .boolean()
    .refine((value) => value === true, 'Vous devez accepter les conditions de suppression'),
});

const roleLabel = (role) => {
  if (role === 'ADMIN') return 'Administrateur';
  if (role === 'DOCTOR') return 'Médecin';
  if (role === 'PATIENT') return 'Patient';
  return 'Compte';
};

function SettingsPage() {
  const navigate = useNavigate();
  const session = getCurrentSession();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(deletionSchema),
    defaultValues: {
      reason: 'PLUS_BESOIN',
      reasonDetail: '',
      acceptDeletionTerms: false,
    },
  });

  const selectedReason = watch('reason');

  const handleLogout = async () => {
    try {
      await logoutCurrentUser();
      toast.success('Déconnexion réussie.');
      navigate('/');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible de se déconnecter pour le moment.');
    }
  };

  const handleDeleteAccount = async (values) => {
    try {
      await deleteCurrentUserAccount(values);
      toast.success('Votre compte a été supprimé.');
      navigate('/');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Suppression impossible pour le moment.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Badge variant="info">Paramètres du compte</Badge>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Gérez votre session et votre compte</h1>
        <p className="max-w-3xl text-slate-600">
          Cette section n’est visible que lorsque vous êtes connecté. Vous pouvez vous déconnecter ou supprimer votre compte.
        </p>
      </header>

      <section className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <MotionCard className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="success">Compte connecté</Badge>
              <h2 className="text-2xl font-bold text-slate-900">{session.user?.email || 'Votre compte'}</h2>
              <p className="text-sm text-slate-600">
                {roleLabel(session.user?.role)} - {session.user?.isVerified ? 'Compte vérifié' : 'Compte non vérifié'}
              </p>
            </div>
            <Avatar name={session.user?.email || 'Compte'} size="lg" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="bg-slate-50/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Téléphone</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{session.user?.phone || 'Non renseigné'}</p>
            </Card>
            <Card className="bg-slate-50/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Tableau de bord</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{dashboardRouteByRole[session.user?.role] || '/'}</p>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate(dashboardRouteByRole[session.user?.role] || '/')} className="gap-2">
              <Shield size={16} />
              Mon espace
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut size={16} />
              Se déconnecter
            </Button>
          </div>
        </MotionCard>

        <MotionCard className="space-y-5 border-red-200 bg-white/95">
          <div className="flex items-center gap-2">
            <Trash2 className="text-red-600" size={18} />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Supprimer mon compte</h2>
              <p className="text-sm text-slate-600">Cette action est irréversible.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(handleDeleteAccount)}>
            <div className="space-y-1.5">
              <label htmlFor="reason" className="text-sm font-medium text-slate-700">
                Cause de suppression
              </label>
              <select
                id="reason"
                className="h-12 w-full rounded-[10px] border border-slate-300 bg-white px-3.5 text-sm text-slate-800 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                {...register('reason')}
              >
                {deletionReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
              {errors.reason ? <p className="text-xs text-red-600">{errors.reason.message}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reasonDetail" className="text-sm font-medium text-slate-700">
                Précision complémentaire
              </label>
              <textarea
                id="reasonDetail"
                rows={4}
                placeholder="Décrivez brièvement votre demande"
                className="w-full rounded-[10px] border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                {...register('reasonDetail')}
              />
              <p className="text-xs text-slate-500">
                {selectedReason === 'AUTRE'
                  ? 'Merci d’indiquer le détail si vous choisissez une autre raison.'
                  : 'Optionnel, mais utile pour mieux comprendre votre demande.'}
              </p>
              {errors.reasonDetail ? <p className="text-xs text-red-600">{errors.reasonDetail.message}</p> : null}
            </div>

            <label className="flex items-start gap-3 rounded-[14px] bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 accent-red-600"
                {...register('acceptDeletionTerms')}
              />
              <span>
                J’accepte la suppression définitive de mon compte, de mes données associées et je comprends que cette action est irréversible.
              </span>
            </label>
            {errors.acceptDeletionTerms ? <p className="text-xs text-red-600">{errors.acceptDeletionTerms.message}</p> : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full gap-2 bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 size={16} />
              Supprimer définitivement le compte
            </Button>
          </form>
        </MotionCard>
      </section>

    </div>
  );
}

export default SettingsPage;