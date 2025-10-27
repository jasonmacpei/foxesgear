"use client";

import * as React from "react";

type Toast = {
  id: number;
  title?: string;
  description?: string;
  variant?: "success" | "error" | "info";
};

type ToastContextValue = {
  show: (opts: Omit<Toast, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(1);

  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const show = React.useCallback((opts: Omit<Toast, "id">) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, ...opts }]);
    // Auto dismiss after 3 seconds
    window.setTimeout(() => remove(id), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[100] flex items-start justify-end p-4 sm:p-6">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={[
                "pointer-events-auto w-full rounded-md border px-4 py-3 shadow-md",
                "bg-card text-foreground border-border",
                t.variant === "success" ? "border-emerald-400/50" : "",
                t.variant === "error" ? "border-red-400/50" : "",
              ].join(" ")}
              role="status"
              aria-live="polite"
            >
              {t.title ? <div className="text-sm font-semibold">{t.title}</div> : null}
              {t.description ? (
                <div className="mt-0.5 text-sm text-muted-foreground">{t.description}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}


