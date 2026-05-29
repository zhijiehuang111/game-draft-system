import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AngledPanel } from "./AngledPanel.js";

type ToastKind = "info" | "error" | "success";

let externalShow: ((message: string, kind?: ToastKind) => void) | null = null;

export function showToast(message: string, kind: ToastKind = "info"): void {
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

const TONE: Record<
  ToastKind,
  { variant: "hex" | "gold" | "crimson"; accent: string }
> = {
  info: { variant: "hex", accent: "#0AC8B9" },
  success: { variant: "gold", accent: "#C8AA6E" },
  error: { variant: "crimson", accent: "#C8404B" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
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
        {items.map((t) => {
          const tone = TONE[t.kind];
          return (
            <AngledPanel
              key={t.id}
              variant={tone.variant}
              notch={8}
              className="slide-in-right min-w-[260px] max-w-[360px]"
            >
              <div className="flex items-stretch">
                <div className="w-[3px]" style={{ background: tone.accent }} />
                <div className="flex-1 px-4 py-2.5 text-[12px] tracking-[0.06em] text-parchment">
                  {t.message}
                </div>
              </div>
            </AngledPanel>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
