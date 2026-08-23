import { Mail, Phone } from 'lucide-react';
import React from 'react';

/**
 * A blood network lives on trust, so the person behind it is named plainly with
 * a way to reach him. The emergency number is set apart because that is the one
 * thing someone in a hurry needs to find without reading anything else.
 */
export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-[1600px] px-6 lg:px-10 py-10">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <p className="font-black text-slate-900">LifelineBD</p>
            <p className="mt-1.5 text-sm text-slate-500 max-w-sm leading-relaxed">
              Connecting blood donors with the people who need them, across Bangladesh.
            </p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700">Contact</p>
            <p className="mt-2 text-sm text-slate-900 font-semibold">Kawsar Newaz Chowdhury</p>
            <p className="text-sm text-slate-500">
              Founder, Shahnaz and Manik Foundation
            </p>
            <a
              href="mailto:kawsarnewazchowdhury@gmail.com"
              className="mt-2.5 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-rose-600 transition-colors break-all"
            >
              <Mail className="w-4 h-4 shrink-0" />
              kawsarnewazchowdhury@gmail.com
            </a>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700">Emergency</p>
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

        <p className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400">
          © {year} LifelineBD · Donor contact details are shared only with signed-in
          users, and health information stays private to each donor.
        </p>
      </div>
    </footer>
  );
};
