import { Download, Ellipsis, EllipsisVertical, Menu, Share, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getInstallPrompt, isNativeApp, onInstallPromptChange, promptInstall } from '../pwa';

// Mobile-only "install as app" banner. Install works differently per browser:
//   prompt  - Chrome has fired beforeinstallprompt: our button opens the real dialog
//   menu    - Android, no prompt (yet): point at the browser menu's Install item.
//             Chrome only fires the event after a tap and ~30s on the page, and
//             Samsung/Mi/Opera/Custom Tabs often never do -- relying on it alone
//             meant most phones saw no banner at all (reported 2026-10-05).
//             If the event arrives later, the banner switches to `prompt`.
//   ios     - iPhone/iPad (Safari, or Chrome/Edge on iOS 16.4+): Share -> Add to Home Screen
//   in-app  - Facebook/Messenger/Instagram's built-in browser can't install;
//             most of our visitors arrive from Facebook links, so tell them how to get out
type Variant = 'prompt' | 'menu' | 'ios' | 'in-app';

const DISMISS_KEY = 'installBannerDismissedAt';
const DISMISS_DAYS = 14;
const SHOW_DELAY_MS = 6000; // let the page make its first impression first

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const isMobile = () =>
  window.matchMedia('(max-width: 767px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isInAppBrowser = () => /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\//i.test(navigator.userAgent);
const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = () => /Android/i.test(navigator.userAgent);

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false; // storage blocked: just show it
  }
}

export const InstallAppBanner: React.FC = () => {
  const [eligible] = useState(() => !isNativeApp() && !isStandalone() && isMobile() && !recentlyDismissed());
  const [hasPrompt, setHasPrompt] = useState(() => !!getInstallPrompt());
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => onInstallPromptChange(() => setHasPrompt(!!getInstallPrompt())), []);

  const variant: Variant | null = !eligible || dismissed
    ? null
    : hasPrompt ? 'prompt'
    : isInAppBrowser() ? 'in-app'
    : isIos() ? 'ios'
    : isAndroid() ? 'menu'
    : null;

  useEffect(() => {
    if (!variant) return;
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [variant]);

  if (!variant || !visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // storage blocked: hidden for this visit only
    }
    setDismissed(true);
  };

  const install = async () => {
    const accepted = await promptInstall();
    if (accepted) setDismissed(true);
  };

  const copy = {
    prompt: {
      title: 'অ্যাপ হিসেবে ইনস্টল করুন',
      body: 'ফ্রি • Play Store লাগবে না • এক ট্যাপে খুলবে'
    },
    menu: {
      title: 'অ্যাপ হিসেবে ইনস্টল করুন',
      body: null
    },
    ios: {
      title: 'হোম স্ক্রিনে অ্যাপ যোগ করুন',
      body: null
    },
    'in-app': {
      title: 'অ্যাপ ইনস্টল করতে ব্রাউজারে খুলুন',
      body: null
    }
  }[variant];

  // Glyphs like ⋮ render as ":" in Bengali fonts, so menu/share hints use icons.
  const iconClass = 'inline w-3.5 h-3.5 -mt-0.5';

  return (
    <div
      role="region"
      aria-label="Install the Roktobondhu app"
      className="fixed inset-x-3 bottom-3 mb-[env(safe-area-inset-bottom)] z-30 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-xl shadow-slate-900/10">
        <img src="/logo-mark.svg" alt="" className="w-11 h-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-brand-ink dark:text-brand-green-light leading-snug">{copy.title}</p>
          {variant === 'ios' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              ব্রাউজারের <Share className={iconClass} aria-label="Share" /> চাপুন, তারপর “Add to Home Screen”
            </p>
          ) : variant === 'menu' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              ব্রাউজারের <EllipsisVertical className={iconClass} aria-label="menu" /> বা <Menu className={iconClass} aria-label="menu" /> মেনু থেকে “Install app” বা “Add to Home screen” চাপুন
            </p>
          ) : variant === 'in-app' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              উপরের <EllipsisVertical className={iconClass} aria-label="menu" /> বা <Ellipsis className={iconClass} aria-label="menu" /> মেনু থেকে “Open in browser” চাপুন
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{copy.body}</p>
          )}
        </div>
        {variant === 'prompt' && (
          <button
            onClick={install}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
