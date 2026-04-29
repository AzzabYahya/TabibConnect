import { Link } from 'react-router-dom';

import Button from '../components/ui/Button';

function NotFoundPage() {
  return (
    <div className="grid min-h-[40vh] place-items-center rounded-2xl border border-white/60 bg-white/80 p-8 text-center shadow-xl">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.18em] text-med-primary">404</p>
        <h1 className="text-3xl font-bold text-slate-900">Page introuvable</h1>
        <p className="text-slate-600">Cette route n'existe pas dans l'application frontend.</p>
        <Link to="/">
          <Button>Retour accueil</Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
