import { LogOut, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { getCurrentSession } from '../../lib/auth';
import { logoutCurrentUser } from '../../lib/accountActions';

const roleLabels = {
  ADMIN: 'Administrateur',
  DOCTOR: 'Médecin',
  PATIENT: 'Patient',
};

function AccountSettingsPanel({ title = 'Mon compte', className = '' }) {
  const navigate = useNavigate();
  const session = getCurrentSession();
  const user = session.user || {};

  const handleLogout = async () => {
    try {
      await logoutCurrentUser();
      toast.success('Déconnexion réussie.');
      navigate('/');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible de se déconnecter.');
    }
  };

  return (
    <Card className={`space-y-4 border-slate-200 bg-slate-50/50 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Informations de connexion et gestion de votre session.
          </p>
        </div>
        <Avatar name={user.email || 'Compte'} size="md" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Mail size={12} />
            Email
          </p>
          <p className="mt-1 break-all text-sm font-semibold text-slate-900">{user.email || '—'}</p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Phone size={12} />
            Téléphone
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{user.phone || 'Non renseigné'}</p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Type de compte</p>
          <p className="mt-1">
            <Badge variant="info">{roleLabels[user.role] || user.role || 'Compte'}</Badge>
          </p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            <ShieldCheck size={12} />
            Vérification
          </p>
          <p className="mt-1">
            <Badge variant={user.isVerified ? 'success' : 'warning'}>
              {user.isVerified ? 'Compte vérifié' : 'En attente de vérification'}
            </Badge>
          </p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Pour toute question sur vos données personnelles ou l’accès à votre dossier, écrivez à{' '}
        <a href="mailto:contact@tabibconnect.ma" className="font-medium text-med-primary hover:underline">
          contact@tabibconnect.ma
        </a>
        .
      </p>

      <Button variant="outline" onClick={handleLogout} className="gap-2">
        <LogOut size={16} />
        Se déconnecter
      </Button>
    </Card>
  );
}

export default AccountSettingsPanel;
