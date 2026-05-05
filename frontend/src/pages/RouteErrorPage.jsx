import { useRouteError, Link } from 'react-router-dom';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';

function RouteErrorPage() {
  const error = useRouteError();
  console.error('Route error:', error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertCircle size={40} />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Page introuvable ou erreur de navigation</h1>
      <p className="mb-8 max-w-md text-slate-600">
        Nous n'avons pas pu charger cette page. Cela peut être dû à un problème de connexion ou une erreur interne.
      </p>
      
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-[#1A6B8A] text-white hover:bg-[#15556d]"
        >
          <RefreshCw size={18} />
          Rafraîchir
        </Button>
        <Link to="/">
          <Button variant="outline" className="flex items-center gap-2">
            <Home size={18} />
            Retour à l'accueil
          </Button>
        </Link>
      </div>
      
      {import.meta.env.DEV && (
        <div className="mt-12 max-w-full overflow-auto rounded-lg bg-slate-900 p-4 text-left font-mono text-xs text-red-400 shadow-inner">
          <p className="mb-2 font-bold uppercase tracking-wider text-slate-500">Détails techniques (Dev) :</p>
          <pre>{error?.message || error?.statusText || JSON.stringify(error)}</pre>
        </div>
      )}
    </div>
  );
}

export default RouteErrorPage;
