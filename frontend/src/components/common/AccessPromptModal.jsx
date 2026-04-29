import { Link } from 'react-router-dom';

import Button from '../ui/Button';
import Modal from '../ui/Modal';

function AccessPromptModal({
  isOpen,
  onClose,
  redirectTo,
  doctorName,
  title = 'Continuez votre réservation',
  subtitle,
}) {
  const bookingSubtitle = doctorName
    ? `Créez un compte patient ou connectez-vous pour confirmer ce rendez-vous avec Dr. ${doctorName}.`
    : 'Créez un compte patient ou connectez-vous pour poursuivre votre demande en toute sécurité.';
  const resolvedSubtitle = subtitle || bookingSubtitle;
  const loginHref = `/connexion?redirect=${encodeURIComponent(redirectTo || '/')}`;
  const registerHref = `/inscription?redirect=${encodeURIComponent(redirectTo || '/')}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm text-slate-600">{resolvedSubtitle}</p>
          <p className="text-xs text-slate-500">
            Vos données restent protégées dans un parcours sécurisé.
          </p>
        </div>

        <div className="grid gap-3">
          <Link to={loginHref}>
            <Button className="w-full">Se connecter</Button>
          </Link>
          <Link to={registerHref}>
            <Button variant="outline" className="w-full">
              Créer un compte
            </Button>
          </Link>
          <span
            className="inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 underline decoration-dotted underline-offset-4"
            aria-disabled="true"
            title="Non disponible pour les réservations médicales"
          >
            Continuer sans compte
          </span>
        </div>
      </div>
    </Modal>
  );
}

export default AccessPromptModal;
