function MedicalHeroAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_220px_at_15%_10%,#1f6f8b_0%,#143246_35%,#0f1923_70%)]" />
      <div className="absolute inset-0 opacity-45">
        <div className="absolute -left-10 top-3 h-44 w-44 rounded-full border border-cyan-200/30 shadow-[0_0_60px_rgba(34,211,238,0.4)] animate-[ring_7s_ease-in-out_infinite]" />
        <div className="absolute left-[30%] top-7 h-28 w-28 rounded-full border border-emerald-200/30 shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-[ring_6s_ease-in-out_infinite_0.8s]" />
        <div className="absolute right-10 top-4 h-40 w-40 rounded-full border border-sky-200/25 shadow-[0_0_60px_rgba(56,189,248,0.35)] animate-[ring_8s_ease-in-out_infinite_0.5s]" />
      </div>

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1400 160" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gridFade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="ecgStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="0.45" stopColor="#34d399" />
            <stop offset="1" stopColor="#60a5fa" />
          </linearGradient>
        </defs>

        <g opacity="0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`h-${i}`} x1="0" x2="1400" y1={i * 16} y2={i * 16} stroke="url(#gridFade)" strokeWidth="1" />
          ))}
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={`v-${i}`} y1="0" y2="160" x1={i * 80} x2={i * 80} stroke="url(#gridFade)" strokeWidth="1" />
          ))}
        </g>

        <path
          d="M0,108 L120,108 L150,108 L178,83 L206,138 L230,108 L300,108 L330,108 L360,93 L390,122 L420,108 L500,108
             L530,108 L560,80 L590,141 L620,108 L700,108 L730,108 L760,94 L790,124 L820,108 L940,108
             L970,108 L1000,82 L1028,138 L1055,108 L1140,108 L1172,108 L1200,93 L1230,122 L1260,108 L1400,108"
          fill="none"
          stroke="url(#ecgStroke)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-[dash_6s_linear_infinite]"
          strokeDasharray="10 8"
        />

        <circle cx="190" cy="83" r="3" fill="#67e8f9" className="animate-pulse" />
        <circle cx="560" cy="80" r="3" fill="#6ee7b7" className="animate-pulse" />
        <circle cx="1000" cy="82" r="3" fill="#93c5fd" className="animate-pulse" />
      </svg>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -220; }
        }
        @keyframes ring {
          0%, 100% { transform: scale(0.9); opacity: 0.4; }
          50% { transform: scale(1.08); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export default MedicalHeroAnimation;

