const variantClassName = {
  info: 'bg-med-primary/15 text-med-primary',
  success: 'bg-med-secondary/20 text-emerald-800',
  warning: 'bg-med-accent/25 text-amber-900',
  neutral: 'bg-slate-200 text-slate-700',
};

function Badge({ children, variant = 'neutral' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        variantClassName[variant] || variantClassName.neutral
      }`}
    >
      {children}
    </span>
  );
}

export default Badge;
