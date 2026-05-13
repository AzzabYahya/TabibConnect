import { forwardRef } from 'react';
import React from 'react';

const Card = forwardRef(function Card({ children, className = '', ...props }, ref) {
  return (
    <article
      ref={ref}
      className={`rounded-2xl border border-white/40 bg-white/80 p-5 shadow-xl shadow-med-primary/10 backdrop-blur ${className}`}
      {...props}
    >
      {children}
    </article>
  );
});


Card.displayName = 'Card';

export default Card;
