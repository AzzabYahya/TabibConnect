import { motion } from 'framer-motion';

import Card from './Card';

const MotionCardBase = motion(Card);

function MotionCard({ children, className = '', delay = 0, interactive = true, ...props }) {
  return (
    <MotionCardBase
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      whileHover={interactive ? { y: -4, scale: 1.01 } : undefined}
      whileTap={interactive ? { scale: 0.99 } : undefined}
      className={className}
      {...props}
    >
      {children}
    </MotionCardBase>
  );
}

export default MotionCard;