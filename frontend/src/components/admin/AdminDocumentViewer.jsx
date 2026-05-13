import { useEffect, useState } from 'react';
import { Eye, Download, X, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import Skeleton from '../ui/Skeleton';
import api from '../../lib/api';

/**
 * A reusable component to view and zoom documents in the Admin Dashboard
 */
export default function AdminDocumentViewer({
  endpoint,
  title = "Aperçu du document",
  className = ""
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    let objectUrl = '';

    const load = async () => {
      if (!endpoint) return;
      try {
        setLoading(true);
        setError(false);
        const response = await api.get(endpoint, {
          responseType: 'blob',
        });
        objectUrl = URL.createObjectURL(response.data);
        if (mounted) {
          setUrl(objectUrl);
        }
      } catch (err) {
        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [endpoint]);

  if (error) {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500 ${className}`}>
        Document ou aperçu indisponible.
      </div>
    );
  }

  if (loading) {
    return <Skeleton className={`h-48 w-full rounded-2xl ${className}`} />;
  }

  if (!url) return null;

  return (
    <>
      <div className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md ${className}`}>
        <div className="flex items-center justify-between border-b border-slate-50 px-3 py-2 bg-slate-50/50">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => window.open(url, '_blank')}
              className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-med-primary transition-colors"
              title="Ouvrir dans un nouvel onglet"
            >
              <Download size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-med-primary transition-colors"
            >
              <Eye size={14} />
            </button>
          </div>
        </div>

        <div className="relative cursor-zoom-in" onClick={() => setIsOpen(true)}>
          <img
            src={url}
            alt={title}
            className="h-48 w-full object-cover bg-slate-100"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition-all group-hover:bg-slate-900/20 group-hover:opacity-100">
            <div className="rounded-full bg-white/90 p-2 shadow-lg">
              <ZoomIn size={20} className="text-slate-900" />
            </div>
          </div>
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 cursor-zoom-out" onClick={() => setIsOpen(false)} />

          <div className="relative z-[101] flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-med-primary/10 p-2 text-med-primary">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{title}</h3>
                  <p className="text-xs text-slate-500">Aperçu haute résolution</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center">
              <img src={url} alt={title} className="max-w-full shadow-lg rounded-lg" />
            </div>

            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex justify-between items-center">
              <p className="text-xs text-slate-500 italic">Document confidentiel • Accès Admin uniquement</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
                  <Download size={16} className="mr-2" /> Télécharger
                </Button>
                <Button size="sm" onClick={() => setIsOpen(false)}>Fermer</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const variants = {
    primary: 'bg-med-primary text-white hover:bg-med-primary-dark shadow-med-primary/20',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
