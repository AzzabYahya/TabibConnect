import { useNavigate, useSearchParams } from 'react-router-dom';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function PaymentCancelPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = params.get('appointmentId');

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Card className="space-y-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Paiement annulé</h1>
        <p className="text-sm text-slate-600">
          Le paiement carte a été annulé. Vous pouvez réessayer à tout moment.
        </p>
        <div className="flex items-center justify-center gap-2">
          {appointmentId ? (
            <Button onClick={() => navigate(`/appointment/${appointmentId}`)}>Revenir au rendez-vous</Button>
          ) : null}
          <Button variant="outline" onClick={() => navigate('/dashboard/patient')}>
            Retour au dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default PaymentCancelPage;

