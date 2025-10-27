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
      <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <div className="flex w-full max-w-md sm:max-w-lg flex-col gap-3">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={[
                "pointer-events-auto w-full rounded-md border px-5 py-4 sm:px-6 sm:py-5 shadow-lg",
                "bg-card text-foreground border-border",
                t.variant === "success" ? "border-emerald-400/50" : "",
                t.variant === "error" ? "border-red-400/50" : "",
              ].join(" ")}
              role="status"
              aria-live="polite"
            >
              {t.title ? <div className="text-base font-semibold sm:text-lg">{t.title}</div> : null}
              {t.description ? (
                <div className="mt-1 text-sm sm:text-base text-muted-foreground">{t.description}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}


