import { Mail, Phone } from 'lucide-react';
import React from 'react';

/**
 * A blood network lives on trust, so the person behind it is named plainly with
 * a way to reach him. The emergency number is set apart because that is the one
 * thing someone in a hurry needs to find without reading anything else.
 */
interface FooterProps {
  onOpenFaq: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenFaq }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="mx-auto w-full max-w-[1600px] px-6 lg:px-10 py-10">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="Roktobondhu Bangladesh" className="w-10 h-10 rounded-xl shrink-0" />
              <div>
                <p className="font-black text-slate-900 dark:text-slate-100">Roktobondhu Bangladesh</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-rose-500">Save Life By Your Blood</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500 max-w-sm leading-relaxed">
              Connecting blood donors with the people who need them, across Bangladesh.
            </p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Help</p>
            <button
              onClick={onOpenFaq}
              className="mt-2 block text-sm text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-left"
            >
              সাহায্য / যেভাবে কাজ করে (FAQ)
            </button>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Contact</p>
            <p className="mt-2 text-sm text-slate-900 dark:text-slate-100 font-semibold">Kawsar Newaz Chowdhury</p>
            <p className="text-sm text-slate-500">
              Founder, Shahnaz and Manik Foundation
            </p>
            <a
              href="mailto:kawsarnewazchowdhury@gmail.com"
              className="mt-2.5 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors break-all"
            >
              <Mail className="w-4 h-4 shrink-0" />
              kawsarnewazchowdhury@gmail.com
            </a>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Emergency</p>
            <a
              href="tel:+8801685946624"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-white font-bold transition-colors"
            >
              <Phone className="w-4 h-4" />
              01685946624
            </a>
            <p className="mt-2 text-xs text-slate-500">
              For urgent help only
            </p>
          </div>
        </div>

        <p className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
          © {year} Roktobondhu Bangladesh · Donor contact details are shared only with signed-in
          users, and health information stays private to each donor.
        </p>
      </div>
    </footer>
  );
};
