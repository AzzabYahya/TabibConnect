import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

const MotionDiv = motion.div;

function Modal({ isOpen, title, onClose, children }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 sm:items-center"
          onClick={onClose}
        >
          <MotionDiv
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="my-auto w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-white/40 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100"
              >
                x
              </button>
            </div>
            {children}
          </MotionDiv>
        </MotionDiv>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export default Modal;
