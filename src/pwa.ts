// PWA wiring that must run before React renders. Chrome can fire
// `beforeinstallprompt` as soon as it has parsed the manifest, and a
// listener added later in a component effect would miss it. initPwa() is
// called once from main.tsx. These listeners live for the whole page, so
// they have no cleanup.

// Chrome-only event, not in TypeScript's DOM lib.
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

// Inside the Capacitor Android app: already installed, has its own shell.
export function isNativeApp(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export function initPwa(): void {
  if (isNativeApp()) return;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); // our own banner replaces Chrome's mini-infobar
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });

  // Production only: a service worker and Vite's dev-server HMR fight.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(error => {
        console.error('Service worker registration failed:', error);
      });
    });
  }
}

export const getInstallPrompt = (): BeforeInstallPromptEvent | null => deferredPrompt;

export function onInstallPromptChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Chrome allows prompt() once per event, so the event is consumed here.
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  deferredPrompt = null;
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}
