import { useState } from 'react';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function Avatar({ src, alt, name = '', size = 'md' }) {
  const [hasError, setHasError] = useState(false);
  const sizeClassName = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-24 w-24 text-2xl',
    '2xl': 'h-44 w-44 text-5xl',
  };

  const classes = sizeClassName[size] || sizeClassName.md;

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt || name}
        loading="lazy"
        decoding="async"
        onError={() => setHasError(true)}
        className={`${classes} rounded-full object-cover ring-2 ring-med-primary/20`}
      />
    );
  }

  return (
    <span
      className={`${classes} inline-flex items-center justify-center rounded-full bg-med-primary/15 font-semibold text-med-primary ring-2 ring-med-primary/20`}
      aria-label={alt || name}
      title={name}
    >
      {getInitials(name) || 'TC'}
    </span>
  );
}

export default Avatar;
