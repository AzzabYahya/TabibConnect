import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, LogIn, ShieldCheck, Stethoscope } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../lib/api';
import { createRedirectSearch, dashboardRouteByRole, getCurrentSession, normalizeRedirectPath } from '../lib/auth';
import { storeCsrfToken, storeSession } from '../lib/session';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
});

const trustPoints = [
  'Médecins vérifiés INPE',
  'Confirmation instantanée',
  'Rappels automatiques',
];

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = normalizeRedirectPath(searchParams.get('redirect'));
  const session = getCurrentSession();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!session.isAuthenticated) {
      return;
    }

    navigate(redirectPath || dashboardRouteByRole[session.role] || '/', { replace: true });
  }, [navigate, redirectPath, session.isAuthenticated, session.role]);

  const onSubmit = async (values) => {
    try {
      const csrfResponse = await api.get('/auth/csrf-token');
      storeCsrfToken(csrfResponse.data?.csrfToken || '');

      const response = await api.post('/auth/login', values);
      const payload = response.data?.data || {};

      storeSession({
        accessToken: payload.accessToken,
        user: payload.user,
      });

      toast.success('Connexion réussie.');
      navigate(redirectPath || dashboardRouteByRole[payload.user?.role] || '/', { replace: true });
    } catch (error) {
      const message = error?.response?.data?.message || 'Erreur de connexion';
      toast.error(message);
    }
  };

  const registerHref = `/inscription${createRedirectSearch(redirectPath)}`;

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/60 bg-white shadow-2xl shadow-slate-900/10 lg:grid lg:min-h-[calc(100vh-12rem)] lg:grid-cols-[0.4fr,0.6fr]">
      <div className="relative min-h-[320px] overflow-hidden bg-[#1A6B8A] text-white lg:min-h-0">
        <img
          src="https://images.unsplash.com/photo-1551601651-2a8555f1a136?q=80&w=3158&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Médecin souriante avec stéthoscope"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#114355]/70 via-[#1A6B8A]/70 to-[#0b2230]/85" />
        <div className="relative flex h-full flex-col justify-between p-6 md:p-10">
          <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-white/80">
            <Stethoscope size={18} />
            TabibConnect
          </div>

          <div className="space-y-6">
            <blockquote className="max-w-md text-2xl font-semibold leading-tight md:text-3xl">
              Votre santé, notre priorité. Des médecins vérifiés à portée de clic.
            </blockquote>

            <div className="space-y-3">
              {trustPoints.map((point) => (
                <div key={point} className="flex items-center gap-3 text-sm md:text-base">
                  <CheckCircle2 size={18} className="text-[#CFF4E6]" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center bg-white p-6 md:p-10">
        <div className="mx-auto w-full max-w-xl space-y-6">
          <header className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-med-primary">Connexion sécurisée</p>
            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Bon retour sur TabibConnect</h1>
            <p className="text-base text-slate-600">Accédez à votre espace santé</p>
          </header>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              id="login-email"
              type="email"
              label="Email"
              placeholder="patient@tabibconnect.ma"
              suggestions={['patient@tabibconnect.ma', 'admin@tabibconnect.ma', 'dr.amine.fassi@tabibconnect.ma']}
              helperText="Exemples de comptes de démonstration disponibles dans la seed."
              error={errors.email?.message}
              className="h-12 rounded-[10px] border-slate-300 focus:border-[#1A6B8A] focus:ring-[#1A6B8A]/30"
              {...register('email')}
            />
            <Input
              id="login-password"
              type="password"
              label="Mot de passe"
              placeholder="********"
              helperText="Mot de passe de démo: TabibConnect@2026"
              error={errors.password?.message}
              className="h-12 rounded-[10px] border-slate-300 focus:border-[#1A6B8A] focus:ring-[#1A6B8A]/30"
              {...register('password')}
            />
            <div className="flex justify-end">
              <a
                href="mailto:contact@tabibconnect.ma?subject=Mot%20de%20passe%20oublié%20TabibConnect"
                className="text-sm text-slate-500 transition hover:text-slate-800"
              >
                Mot de passe oublié ?
              </a>
            </div>
            <Button type="submit" className="h-[52px] w-full gap-2 rounded-[10px] bg-[#1A6B8A] text-white hover:bg-[#15556d]">
              <LogIn size={16} />
              Se connecter
            </Button>
          </form>

          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.18em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>ou</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-3 text-sm text-slate-600">
            <Link to={registerHref} className="inline-flex items-center gap-1 font-semibold text-[#1A6B8A] transition hover:text-[#15556d]">
              Pas encore de compte ?
              <span aria-hidden="true">→</span>
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
