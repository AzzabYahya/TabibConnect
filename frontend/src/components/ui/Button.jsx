import React from 'react';

const baseClassName =
  'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 transform-gpu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

const variantClassName = {
  primary:
    'bg-med-primary text-white shadow-lg shadow-med-primary/25 hover:-translate-y-0.5 hover:bg-med-primary/90 focus-visible:ring-med-primary',
  secondary:
    'bg-med-secondary text-slate-900 shadow-lg shadow-med-secondary/30 hover:-translate-y-0.5 hover:bg-med-secondary/85 focus-visible:ring-med-secondary',
  accent:
    'bg-med-accent text-slate-900 shadow-lg shadow-med-accent/30 hover:-translate-y-0.5 hover:bg-med-accent/90 focus-visible:ring-med-accent',
  outline:
    'border border-med-primary/40 bg-white/70 text-med-primary hover:border-med-primary hover:bg-med-primary/10 focus-visible:ring-med-primary',
  ghost:
    'text-med-primary hover:bg-med-primary/10 focus-visible:ring-med-primary',
};

const sizeClassName = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
};

function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      className={`${baseClassName} ${variantClassName[variant] || variantClassName.primary} ${sizeClassName[size] || sizeClassName.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
