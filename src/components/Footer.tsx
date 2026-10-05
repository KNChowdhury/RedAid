import { Mail, Phone } from 'lucide-react';
import React from 'react';
import { defineStrings, useStrings } from '../i18n';

// Names (founder, foundation) stay as written in both languages.
const S = defineStrings(
  {
    logoAlt: 'RBB — Roktobondhu Bangladesh',
    tagline: 'Save Life By Your Blood',
    about: 'Connecting blood donors with the people who need them, across Bangladesh.',
    help: 'Help',
    faqLink: 'How it works (FAQ)',
    contact: 'Contact',
    founderRole: 'Founder, Shahnaz and Manik Foundation',
    emergency: 'Emergency',
    urgentOnly: 'For urgent help only',
    privacyNote: '© {year} Roktobondhu Bangladesh · Donor contact details are shared only with signed-in users, and health information stays private to each donor.'
  },
  {
    logoAlt: 'RBB — Roktobondhu Bangladesh',
    tagline: 'রক্ত দিন, জীবন বাঁচান',
    about: 'সারা বাংলাদেশে রক্তদাতাদের সাথে রক্তের প্রয়োজনে থাকা মানুষদের যুক্ত করছি।',
    help: 'সাহায্য',
    faqLink: 'যেভাবে কাজ করে (প্রশ্নোত্তর)',
    contact: 'যোগাযোগ',
    founderRole: 'প্রতিষ্ঠাতা, Shahnaz and Manik Foundation',
    emergency: 'জরুরি',
    urgentOnly: 'শুধু জরুরি প্রয়োজনে',
    privacyNote: '© {year} Roktobondhu Bangladesh · রক্তদাতার যোগাযোগের তথ্য শুধু সাইন ইন করা ব্যবহারকারীরা দেখতে পান, আর স্বাস্থ্য তথ্য প্রত্যেক রক্তদাতার কাছেই গোপন থাকে।'
  }
);

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
  const { s, f } = useStrings(S);

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="mx-auto w-full max-w-[1600px] px-6 lg:px-10 py-10">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo-mark.svg" alt={s.logoAlt} className="w-10 h-10 rounded-xl shrink-0" />
              <div>
                <p className="font-black text-brand-green dark:text-brand-green-light">
                  Roktobondhu<span className="text-rose-600 dark:text-rose-400"> Bangladesh</span>
                </p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-rose-500">{s.tagline}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500 max-w-sm leading-relaxed">
              {s.about}
            </p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{s.help}</p>
            <button
              onClick={onOpenFaq}
              className="mt-2 block text-sm text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-left"
            >
              {s.faqLink}
            </button>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{s.contact}</p>
            <p className="mt-2 text-sm text-slate-900 dark:text-slate-100 font-semibold">Kawsar Newaz Chowdhury</p>
            <p className="text-sm text-slate-500">
              {s.founderRole}
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
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{s.emergency}</p>
            <a
              href="tel:+8801685946624"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-white font-bold transition-colors"
            >
              <Phone className="w-4 h-4" />
              01685946624
            </a>
            <p className="mt-2 text-xs text-slate-500">
              {s.urgentOnly}
            </p>
          </div>
        </div>

        <p className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
          {f(s.privacyNote, { year: String(year) })}
        </p>
      </div>
    </footer>
  );
};
