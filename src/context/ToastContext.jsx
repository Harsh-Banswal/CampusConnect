import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';

const ToastContext = createContext({
  showToast: () => {},
});

function ToastIcon({ type }) {
  if (type === 'success') return <CheckCircle2 size={18} className="text-emerald-600" />;
  if (type === 'error') return <XCircle size={18} className="text-rose-600" />;
  if (type === 'warning') return <TriangleAlert size={18} className="text-amber-600" />;
  return <Info size={18} className="text-sky-600" />;
}

function getToastClasses(type) {
  if (type === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  if (type === 'error') return 'border-rose-200 bg-rose-50 text-rose-900';
  if (type === 'warning') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-sky-200 bg-sky-50 text-sky-900';
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, options = {}) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const type = options.type || 'info';
    const duration = options.duration ?? 3000;

    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      window.setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${getToastClasses(toast.type)}`}
            role="status"
            aria-live="polite"
          >
            <div className="mt-0.5">
              <ToastIcon type={toast.type} />
            </div>
            <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white/50 hover:text-slate-800"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
