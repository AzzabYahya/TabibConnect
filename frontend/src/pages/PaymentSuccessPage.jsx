import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../lib/api';

function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get('session_id');
  const appointmentId = params.get('appointmentId');

  const mutation = useMutation({
    mutationFn: async () =>
      api.post('/payments/confirm-card-session', {
        sessionId,
        appointmentId: appointmentId || undefined,
      }),
    onSuccess: (response) => {
      toast.success('Paiement confirmé avec succès.');
      const id = response.data?.data?.appointmentId || appointmentId;
      if (id) {
        navigate(`/appointment/${id}`, { replace: true });
      } else {
        navigate('/dashboard/patient', { replace: true });
      }
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Confirmation du paiement impossible.');
    },
  });

  useEffect(() => {
    if (sessionId) {
      mutation.mutate();
    }
  }, [sessionId]);

  const statusText = useMemo(() => {
    if (!sessionId) return 'Session de paiement invalide.';
    if (mutation.isPending) return 'Validation du paiement en cours...';
    if (mutation.isError) return 'Le paiement n’a pas pu être validé.';
    return 'Paiement validé.';
  }, [sessionId, mutation.isPending, mutation.isError]);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Card className="space-y-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Paiement carte</h1>
        <p className="text-sm text-slate-600">{statusText}</p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard/patient')}>
            Retour au dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default PaymentSuccessPage;

