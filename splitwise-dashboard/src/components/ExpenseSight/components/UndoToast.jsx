/**
 * UndoToast - A toast notification with undo capability
 * Shows at bottom of screen with a countdown timer and undo button
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';

function Toast({ message, onUndo, onDismiss, duration = 5000 }) {
  const [remaining, setRemaining] = useState(duration);
  const startTimeRef = useRef(Date.now());
  const frameRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left > 0) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        onDismiss();
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [duration, onDismiss]);

  const progress = remaining / duration;

  return (
    <div className="animate-slide-up flex items-center gap-3 px-4 py-3 bg-stone-800/95 backdrop-blur-xl border border-stone-700/50 rounded-2xl shadow-2xl shadow-black/40 min-w-[280px] max-w-[90vw]">
      {/* Progress ring */}
      <div className="relative w-8 h-8 flex-shrink-0">
        <svg width="32" height="32" className="transform -rotate-90">
          <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(120,113,108,0.2)" strokeWidth="3" />
          <circle
            cx="16" cy="16" r="13" fill="none"
            stroke="#14b8a6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 13}`}
            strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress)}`}
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-stone-400">
          {Math.ceil(remaining / 1000)}
        </span>
      </div>

      {/* Message */}
      <p className="text-sm text-stone-300 flex-1 truncate">{message}</p>

      {/* Undo button */}
      <button
        onClick={onUndo}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 text-teal-400 rounded-lg text-xs font-semibold hover:bg-teal-500/30 active:bg-teal-500/40 transition-colors touch-manipulation whitespace-nowrap"
      >
        <RotateCcw size={12} />
        Undo
      </button>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="p-1 text-stone-600 hover:text-stone-400 transition-colors touch-manipulation"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * UndoToastContainer - Manages a stack of undo toasts
 * Usage:
 *   const toast = useUndoToast();
 *   toast.show('Expense deleted', undoFn);
 *   <UndoToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} onUndo={toast.undo} />
 */
export function UndoToastContainer({ toasts, onDismiss, onUndo }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            onUndo={() => onUndo(toast.id)}
            onDismiss={() => onDismiss(toast.id)}
            duration={toast.duration || 5000}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * useUndoToast - Hook for managing undo toasts
 * Returns { toasts, show, dismiss, undo }
 */
export function useUndoToast() {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const show = useCallback((message, undoCallback, duration = 5000) => {
    const id = ++idCounter.current;
    setToasts(prev => [...prev, { id, message, undoCallback, duration }]);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const undo = useCallback((id) => {
    const toast = toasts.find(t => t.id === id);
    if (toast?.undoCallback) {
      toast.undoCallback();
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, [toasts]);

  return { toasts, show, dismiss, undo };
}

export default UndoToastContainer;
