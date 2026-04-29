import React from 'react';
import { MonitorPlay, Mic, Video, Wifi } from 'lucide-react';

import Button from '../ui/Button';
import Card from '../ui/Card';

function TeleconsultationVideoPanel({ appointmentId, doctorName, joinUrl = null }) {
  return (
    <Card className="space-y-4 border-med-primary/20 bg-gradient-to-br from-cyan-50 to-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-med-primary">Téléconsultation vidéo</p>
          <p className="text-sm text-slate-600">Session avec {doctorName}</p>
        </div>
        {joinUrl ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Wifi size={14} /> Prêt à rejoindre
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            <Wifi size={14} /> Lien à configurer
          </span>
        )}
      </div>

      <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
        <p className="inline-flex items-center gap-2 rounded-lg bg-white p-2">
          <Video size={15} className="text-med-primary" /> Caméra
        </p>
        <p className="inline-flex items-center gap-2 rounded-lg bg-white p-2">
          <Mic size={15} className="text-med-primary" /> Micro
        </p>
        <p className="inline-flex items-center gap-2 rounded-lg bg-white p-2">
          <MonitorPlay size={15} className="text-med-primary" /> Écran
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {joinUrl ? (
          <a href={joinUrl} target="_blank" rel="noreferrer">
            <Button className="gap-2">
              <MonitorPlay size={16} /> Rejoindre la consultation
            </Button>
          </a>
        ) : (
          <Button className="gap-2" disabled>
            <MonitorPlay size={16} /> Lien de consultation non disponible
          </Button>
        )}
        <p className="text-xs text-slate-500">Référence session: {appointmentId}</p>
      </div>
    </Card>
  );
}

export default TeleconsultationVideoPanel;
