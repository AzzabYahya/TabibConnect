import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Button from '../ui/Button';

class GeneralErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleRetry = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle size={40} />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">Oups ! Quelque chose s'est mal passé</h1>
          <p className="mb-8 max-w-md text-slate-600">
            Une erreur inattendue est survenue. Nous nous excusons pour le désagrément. 
            Nos équipes techniques ont été informées.
          </p>
          
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button 
              onClick={this.handleRetry}
              className="flex items-center gap-2 bg-[#1A6B8A] text-white hover:bg-[#15556d]"
            >
              <RefreshCw size={18} />
              Réessayer
            </Button>
            <Button 
              onClick={this.handleGoHome}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home size={18} />
              Retour à l'accueil
            </Button>
          </div>
          
          {import.meta.env.DEV && (
            <div className="mt-12 max-w-full overflow-auto rounded-lg bg-slate-900 p-4 text-left font-mono text-xs text-red-400 shadow-inner">
              <p className="mb-2 font-bold uppercase tracking-wider text-slate-500">Détails de l'erreur (Dev uniquement) :</p>
              <pre>{this.state.error?.stack || this.state.error?.toString()}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default GeneralErrorBoundary;
