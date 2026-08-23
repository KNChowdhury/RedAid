import { CalendarCheck, Heart, MapPin, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CompletedDonation, fetchCompletedDonations } from '../services/lifelineService';

export const SuccessStories: React.FC = () => {
  const [donations, setDonations] = useState<CompletedDonation[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <section className="p-6 lg:p-10 lg:overflow-hidden flex flex-col lg:h-full bg-white min-w-0">
      <header className="mb-8">
        <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 leading-none mb-3">
          Lives<br />
          <span className="text-rose-600">Actually Saved.</span>
        </h1>
        <p className="text-slate-400 font-bold max-w-lg uppercase text-[11px] tracking-widest">
          Every confirmed donation, and who gave it.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scroll pb-12">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm font-bold uppercase tracking-widest">Loading...</div>
        ) : donations.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-100">
            <Heart className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No Confirmed Donations Yet</h3>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Once a donation is confirmed, it shows up here.</p>
          </div>
        ) : (
          donations.map(d => (
            <div
              key={d.donationId}
              className="bg-white p-5 sm:p-6 rounded-[1.8rem] border border-slate-100 shadow-xs flex items-start gap-4"
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base text-slate-700 font-semibold leading-relaxed">
                  <span className="font-black text-slate-900">{d.donorName}</span> donated{' '}
                  <span className="text-rose-600 font-black">{d.units} bag{d.units === 1 ? '' : 's'}</span> of{' '}
                  <span className="font-mono font-bold text-rose-600">{d.bloodGroup}</span> for{' '}
                  <span className="font-bold text-slate-900">{d.patientName}</span> at {d.hospitalName}.
                </p>
                <p className="text-slate-400 text-xs uppercase font-bold tracking-wider flex items-center flex-wrap gap-x-2 gap-y-1 mt-2">
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
      </div>
    </section>
  );
};
