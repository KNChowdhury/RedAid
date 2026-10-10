import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { defineStrings, useStrings } from '../i18n';

/* ---------- In-app feedback: toasts + confirm dialog ----------
 * Replaces window.alert / window.confirm, which look like a browser error,
 * can't be translated or styled, and on phones read as "the site broke".
 * One provider at the app root owns all of it, so every screen shows
 * messages the same way.
 */

const S = defineStrings(
  {
    dismiss: 'Dismiss',
    confirmYes: 'Yes, close',
    confirmNo: 'Keep editing',
  },
  {
    dismiss: 'বন্ধ করুন',
    confirmYes: 'হ্যাঁ, বন্ধ করুন',
    confirmNo: 'লিখতে থাকুন',
  }
);

type ToastKind = 'error' | 'success' | 'info';
interface Toast { id: number; kind: ToastKind; message: string }
interface ConfirmRequest { message: string; resolve: (ok: boolean) => void }

interface FeedbackApi {
  toast: (message: string, kind?: ToastKind) => void;
  /** Resolves true if the user confirmed. Only one dialog at a time; a newer request cancels the older one. */
  confirm: (message: string) => Promise<boolean>;
}

// Outside a provider (tests, isolated renders) fall back to the browser so nothing silently breaks.
const fallback: FeedbackApi = {
  toast: message => window.alert(message),
  confirm: message => Promise.resolve(window.confirm(message)),
};

const FeedbackContext = createContext<FeedbackApi>(fallback);

export const useFeedback = () => useContext(FeedbackContext);

const TOAST_MS: Record<ToastKind, number> = { error: 7000, success: 4000, info: 5000 };

const toastStyle: Record<ToastKind, { box: string; icon: React.ReactNode }> = {
  error: {
    box: 'border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900',
    icon: <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />,
  },
  success: {
    box: 'border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
  },
  info: {
    box: 'border-sky-200 dark:border-sky-900/60 bg-white dark:bg-slate-900',
    icon: <Info className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
  },
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { s } = useStrings(S);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());
  const pendingRef = useRef<ConfirmRequest | null>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback((id: number) => {
    setToasts(list => list.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = 'error') => {
    const id = nextId.current++;
    // Keep at most 3 on screen; drop the oldest.
    setToasts(list => [...list.slice(-2), { id, kind, message }]);
    timers.current.set(id, window.setTimeout(() => dismiss(id), TOAST_MS[kind]));
  }, [dismiss]);

  const settle = useCallback((ok: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(ok);
  }, []);

  const confirm = useCallback((message: string) => new Promise<boolean>(resolve => {
    pendingRef.current?.resolve(false);
    const request = { message, resolve };
    pendingRef.current = request;
    setPending(request);
  }), []);

  // Clear timers and release any open confirm on unmount.
  useEffect(() => () => {
    timers.current.forEach(timer => window.clearTimeout(timer));
    timers.current.clear();
    pendingRef.current?.resolve(false);
  }, []);

  // While the dialog is open, Escape means "keep editing". Capture phase +
  // stopImmediatePropagation so the overlay underneath doesn't also react.
  useEffect(() => {
    if (!pending) return;
    keepRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      settle(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [pending, settle]);

  const api = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      {/* Toasts: bottom on phones (thumb reach, above the keyboard-free area), top-right on desktop. */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:items-end">
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${toastStyle[t.kind].box}`}
          >
            <span className="mt-px shrink-0">{toastStyle[t.kind].icon}</span>
            <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label={s.dismiss} className="-m-1 shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {pending && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center animate-in fade-in duration-150" onClick={e => { if (e.target === e.currentTarget) settle(false); }}>
          <div role="alertdialog" aria-modal="true" aria-describedby="feedback-confirm-message" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 animate-in slide-in-from-bottom-4 duration-200">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <p id="feedback-confirm-message" className="text-center text-[15px] font-semibold leading-snug text-slate-800 dark:text-slate-100">{pending.message}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button ref={keepRef} type="button" onClick={() => settle(false)} className="rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {s.confirmNo}
              </button>
              <button type="button" onClick={() => settle(true)} className="rounded-xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-700">
                {s.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};
