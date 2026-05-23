import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'info' | 'error' | 'success';

let externalShow: ((message: string, kind?: ToastKind) => void) | null = null;

export function showToast(message: string, kind: ToastKind = 'info'): void {
  externalShow?.(message, kind);
}

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  show(message: string, kind?: ToastKind): void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  useEffect(() => {
    externalShow = show;
    return () => {
      if (externalShow === show) externalShow = null;
    };
  }, [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded shadow text-sm text-white ${
              t.kind === 'error'
                ? 'bg-red-600'
                : t.kind === 'success'
                ? 'bg-green-600'
                : 'bg-slate-700'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
