import { Download, FileUp, Mail, Pill } from 'lucide-react';

import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { getOrdonnanceDocumentUrl, getOrdonnanceVerifyUrl } from '../../lib/media';
import { formatAppointmentDate } from '../../lib/date';

const SOURCE_LABELS = {
  GENERATED: 'Ordonnance numérique',
  UPLOADED: 'Fichier uploadé',
};

function OrdonnanceExistingView({
  ordonnance,
  language = 'fr',
  variant = 'default',
  onResend,
  resendLabel = 'Renvoyer au patient',
  resendPending = false,
  showQr = false,
}) {
  if (!ordonnance) return null;

  const documentUrl = getOrdonnanceDocumentUrl(ordonnance);
  const medicaments = ordonnance.medicaments || [];
  const isUploaded = ordonnance.source === 'UPLOADED';
  const isGreen = variant === 'patient';

  return (
    <div className={`space-y-3 text-sm ${isGreen ? 'text-green-900' : 'text-slate-700'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isUploaded ? 'info' : 'success'}>
          {isUploaded ? (
            <span className="inline-flex items-center gap-1">
              <FileUp size={12} />
              {SOURCE_LABELS.UPLOADED}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Pill size={12} />
              {SOURCE_LABELS.GENERATED}
            </span>
          )}
        </Badge>
        <span className={isGreen ? 'text-green-800' : 'text-slate-500'}>
          Enregistrée le {formatAppointmentDate(ordonnance.createdAt, language)}
        </span>
      </div>

      {medicaments.length > 0 ? (
        <ul className={`list-disc space-y-1 pl-5 ${isGreen ? 'text-green-900' : 'text-slate-800'}`}>
          {medicaments.map((m, i) => (
            <li key={`${m.medicament}-${i}`}>
              {m.medicament} — {m.posologie}
            </li>
          ))}
        </ul>
      ) : isUploaded ? (
        <p className={isGreen ? 'text-green-800' : 'text-slate-600'}>
          Document fourni par le médecin (PDF ou image). Téléchargez-le ci-dessous.
        </p>
      ) : null}

      {ordonnance.instructions ? (
        <p className={isGreen ? 'text-green-800' : 'text-slate-600'}>
          <span className="font-medium">Instructions :</span> {ordonnance.instructions}
        </p>
      ) : null}

      {ordonnance.renouvelable ? (
        <p className={`text-xs ${isGreen ? 'text-green-700' : 'text-slate-500'}`}>Renouvellement autorisé</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {documentUrl ? (
          <a href={documentUrl} target="_blank" rel="noreferrer">
            <Button variant={isGreen ? 'default' : 'outline'} type="button">
              <Download size={16} className="mr-1" />
              {isUploaded ? 'Télécharger le document' : 'Télécharger le PDF'}
            </Button>
          </a>
        ) : null}
        {onResend ? (
          <Button variant="outline" type="button" onClick={onResend} disabled={resendPending}>
            <Mail size={16} className="mr-1" />
            {resendLabel}
          </Button>
        ) : null}
      </div>

      {showQr && ordonnance.qrCode ? (
        <div className={`mt-2 flex items-start gap-4 ${isGreen ? '' : 'rounded-lg bg-slate-50 p-3'}`}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(getOrdonnanceVerifyUrl(ordonnance.qrCode))}`}
            alt="QR code ordonnance"
            width={80}
            height={80}
            className={`rounded border bg-white ${isGreen ? 'border-green-200' : 'border-slate-200'}`}
          />
          <p className={`text-xs ${isGreen ? 'text-green-800' : 'text-slate-600'}`}>
            Ce QR code permet à votre pharmacie de vérifier l authenticité de votre ordonnance via TabibConnect.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default OrdonnanceExistingView;
