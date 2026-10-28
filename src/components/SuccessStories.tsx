import { CalendarCheck, Heart, MapPin, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { defineStrings, formatNumber, useStrings } from '../i18n';
import { CompletedDonation, fetchCompletedDonations } from '../services/lifelineService';
import { NoMoneyNotice } from './NoMoneyNotice';

const S = defineStrings(
  {
    titleLine1: 'Lives',
    titleLine2: 'Actually Saved.',
    subtitle: 'Every confirmed donation, and who gave it.',
    loading: 'Loading...',
    emptyTitle: 'No Confirmed Donations Yet',
    emptyBody: 'Once a donation is confirmed, it shows up here.',
    // {placeholders} are filled with styled pieces in storyParts() below;
    // Bangla needs a different word order, so the whole sentence is one string.
    story: '{donor} donated {units} of {group} for {patient} at {hospital}.',
    bagOne: '{count} bag',
    bagMany: '{count} bags',
    statDonations: 'Donations',
    statBags: 'Bags given'
  },
  {
    titleLine1: 'যে জীবন',
    titleLine2: 'সত্যিই বেঁচেছে।',
    subtitle: 'প্রতিটি নিশ্চিত রক্তদান, এবং কে দিয়েছেন।',
    loading: 'লোড হচ্ছে...',
    emptyTitle: 'এখনো কোনো নিশ্চিত রক্তদান নেই',
    emptyBody: 'রক্তদান নিশ্চিত হলেই এখানে দেখা যাবে।',
    story: '{donor} {hospital}-এ {patient}-এর জন্য {units} {group} রক্ত দিয়েছেন।',
    bagOne: '{count} ব্যাগ',
    bagMany: '{count} ব্যাগ',
    statDonations: 'রক্তদান',
    statBags: 'ব্যাগ রক্ত'
  }
);

/** Splits a "{name}" template into text and the matching React pieces, keeping the template's word order. */
function storyParts(template: string, pieces: Record<string, React.ReactNode>): React.ReactNode[] {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    if (key && Object.prototype.hasOwnProperty.call(pieces, key)) return <React.Fragment key={i}>{pieces[key]}</React.Fragment>;
    return part;
  });
}

interface SuccessStoriesProps {
  onOpenPolicy?: () => void;
}

export const SuccessStories: React.FC<SuccessStoriesProps> = ({ onOpenPolicy }) => {
  const [donations, setDonations] = useState<CompletedDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const { s, f, lang } = useStrings(S);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchCompletedDonations();
      if (!cancelled) {
        setDonations(rows);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const num = (value: number) => (lang === 'bn' ? formatNumber(value, lang) : String(value));
  const totalBags = donations.reduce((sum, d) => sum + (d.units || 0), 0);

  return (
    <section className="p-4 sm:p-6 lg:p-10 lg:overflow-hidden flex flex-col lg:h-full bg-white dark:bg-slate-900 min-w-0">
      <header className="mb-5 sm:mb-8">
        <h1 className="editorial-title text-3xl sm:text-6xl text-slate-900 dark:text-slate-100 leading-none mb-2 sm:mb-3">
          {s.titleLine1}{' '}
          <span className="text-rose-600 dark:text-rose-400">{s.titleLine2}</span>
        </h1>
        <p className="text-slate-500 text-sm max-w-lg">
          {s.subtitle}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-3 sm:space-y-4 custom-scroll pb-12">
        {!loading && donations.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-4">
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">{num(donations.length)}</p>
              <p className="text-xs font-bold text-emerald-800/70 dark:text-emerald-300/70">{s.statDonations}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 p-4">
              <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">{num(totalBags)}</p>
              <p className="text-xs font-bold text-rose-800/70 dark:text-rose-300/70">{s.statBags}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm font-bold uppercase tracking-widest">{s.loading}</div>
        ) : donations.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-100 dark:border-slate-800">
            <Heart className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{s.emptyTitle}</h3>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">{s.emptyBody}</p>
          </div>
        ) : (
          donations.map(d => (
            <div
              key={d.donationId}
              className="bg-white dark:bg-slate-800/60 p-4 sm:p-6 rounded-2xl sm:rounded-[1.8rem] border border-slate-100 dark:border-slate-800 shadow-xs flex items-start gap-3 sm:gap-4"
            >
              <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                  {storyParts(s.story, {
                    donor: <span className="font-black text-slate-900 dark:text-slate-100">{d.donorName}</span>,
                    units: (
                      <span className="text-rose-600 dark:text-rose-400 font-black">
                        {/* English keeps the plain digits it showed before; Bangla uses Bangla digits. */}
                        {f(d.units === 1 ? s.bagOne : s.bagMany, { count: lang === 'bn' ? formatNumber(d.units, lang) : String(d.units) })}
                      </span>
                    ),
                    group: <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{d.bloodGroup}</span>,
                    patient: <span className="font-bold text-brand-ink dark:text-brand-green-light">{d.patientName}</span>,
                    hospital: d.hospitalName
                  })}
                </p>
                <p className="text-slate-400 text-xs font-semibold flex items-center flex-wrap gap-x-2 gap-y-1 mt-2">
                  {(d.area || d.district) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      {[d.area, d.district].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {d.donatedDate && (
                    <span className="flex items-center gap-1.5">
                      <CalendarCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {d.donatedDate}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}

        <NoMoneyNotice onOpenPolicy={onOpenPolicy} className="mt-6" />
      </div>
    </section>
  );
};
