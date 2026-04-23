import { useEffect } from 'react';

const STYLES = {
  success: 'bg-stone-900 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-600 text-white',
  info: 'bg-blue-600 text-white',
};

export function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`${STYLES[type]} px-5 py-3.5 text-sm font-medium shadow-xl
                  min-w-64 max-w-sm flex items-start justify-between gap-4 animate-slide-in`}
    >
      <span className="leading-relaxed">{message}</span>
      <button
        onClick={onClose}
        className="opacity-60 hover:opacity-100 flex-shrink-0 text-base leading-none mt-0.5"
      >
        ✕
      </button>
    </div>
  );
}
