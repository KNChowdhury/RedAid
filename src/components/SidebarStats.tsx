import { Award, Filter, Heart, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { useDistricts } from '../hooks/useDistricts';
import { DonorProfile, SearchFilters } from '../types';
import { defineStrings, formatDate, formatNumber, useStrings } from '../i18n';
import { CompactSelect } from './CompactSelect';

const S = defineStrings(
  {
    yourImpact: 'Your impact',
    points: 'Roktobondhu points',
    livesOne: '{count} life saved',
    livesMany: '{count} lives saved',
    regular: ' · regular donor',
    signInTitle: 'Sign in to see your impact',
    signInHelp: "Your points and donation history show up here once you're signed in.",
    filters: 'Filters',
    shown: '{count} shown',
    bloodGroup: 'Blood group',
    any: 'Any',
    district: 'District',
    allDistricts: 'All districts',
    area: 'Area',
    allAreas: 'All areas',
    fewer: '− Fewer options',
    more: '+ More options',
    availableNow: 'Available right now',
    donatedBefore: 'Has donated before',
    clear: 'Clear filters',
    eligibility: 'Eligibility Status',
    readyNow: 'Ready Now!',
    // Was "...lives this year...", but livesSaved is an all-time total.
    savedSoFar: "You've saved {count} lives on Roktobondhu Bangladesh."
  },
  {
    yourImpact: 'আপনার অবদান',
    points: 'Roktobondhu পয়েন্ট',
    livesOne: '{count}টি জীবন বাঁচিয়েছেন',
    livesMany: '{count}টি জীবন বাঁচিয়েছেন',
    regular: ' · নিয়মিত দাতা',
    signInTitle: 'আপনার অবদান দেখতে সাইন ইন করুন',
    signInHelp: 'সাইন ইন করলে আপনার পয়েন্ট আর রক্তদানের ইতিহাস এখানে দেখাবে।',
    filters: 'ফিল্টার',
    shown: '{count} জন',
    bloodGroup: 'ব্লাড গ্রুপ',
    any: 'সব',
    district: 'জেলা',
    allDistricts: 'সব জেলা',
    area: 'এলাকা',
    allAreas: 'সব এলাকা',
    fewer: '− কম অপশন',
    more: '+ আরও অপশন',
    availableNow: 'এখন দিতে পারবেন',
    donatedBefore: 'আগে রক্ত দিয়েছেন',
    clear: 'ফিল্টার মুছুন',
    eligibility: 'রক্তদানের যোগ্যতা',
    readyNow: 'এখনই দিতে পারবেন!',
    savedSoFar: 'Roktobondhu Bangladesh-এ আপনি এখন পর্যন্ত {count}টি জীবন বাঁচিয়েছেন।'
  }
);

interface SidebarStatsProps {
  currentUser: DonorProfile | null;
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  onSearch: () => void;
  donorsCount: number;
  // Filters only narrow the donor list, so they're shown on the Network tab
  // only; on FAQ/Requests/etc. they did nothing when clicked. "Your impact"
  // and the eligibility card stay on every tab.
  showFilters: boolean;
}

export const SidebarStats: React.FC<SidebarStatsProps> = ({
  currentUser,
  filters,
  setFilters,
  onSearch,
  donorsCount,
  showFilters
}) => {
  const { s, f, lang } = useStrings(S);
  const districts = useDistricts();
  const selectedDistrictObj = districts.find(d => d.name === filters.district);
  const areasList = selectedDistrictObj ? selectedDistrictObj.areas : [];

  const [showMore, setShowMore] = useState(false);

  // Only offer "clear" when there is something to clear, so the control isn't
  // sitting there implying the list is filtered when it isn't.
  const hasActiveFilters =
    filters.bloodGroup !== 'ALL' ||
    filters.district !== 'ALL' ||
    filters.area !== 'ALL' ||
    filters.availableNowOnly ||
    filters.regularOnly;

  return (
    <aside className="lg:border-r border-slate-200/80 dark:border-slate-800 p-6 lg:p-8 flex flex-col gap-8 bg-slate-50/70 dark:bg-slate-900/70 min-w-0 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto custom-scroll">
      {/* Impact Score Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">{s.yourImpact}</h2>
        </div>

        {currentUser ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="blood-gradient p-6 rounded-3xl text-white shadow-xl shadow-rose-200/60 relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />

            <p className="text-4xl font-black mb-1 tracking-tight font-mono">
              {formatNumber(currentUser.impactScore ?? 0, lang)}
            </p>
            <p className="text-sm opacity-90">{s.points}</p>

            {/* One line of plain prose reads faster than a row of pills. */}
            <p className="mt-4 text-sm opacity-90 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-200 fill-rose-200 shrink-0" />
              {f(currentUser.livesSaved === 1 ? s.livesOne : s.livesMany, { count: currentUser.livesSaved ?? 0 })}
              {currentUser.isRegular ? s.regular : ''}
            </p>
          </motion.div>
        ) : (
          <div className="p-6 rounded-3xl border border-dashed border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 text-center">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{s.signInTitle}</p>
            <p className="text-xs text-slate-500 mt-1">{s.signInHelp}</p>
          </div>
        )}
      </section>

      {/* Smart Search Filter Engine -- hidden (not unmounted) off the Network
          tab, so the "More options" toggle survives switching tabs. */}
      <section className="flex-1" hidden={!showFilters}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            {s.filters}
          </h2>
          <span className="text-xs text-slate-500">{f(s.shown, { count: donorsCount })}</span>
        </div>

        <div className="space-y-4">
          {/* Blood group is how people actually think about this ("O+ লাগবে"),
              so it gets tappable chips rather than a dropdown you have to open
              and hunt through. One tap, and you can see all options at once. */}
          <div>
            <p className="block text-xs font-semibold text-slate-500 mb-2">{s.bloodGroup}</p>
            <div className="grid grid-cols-3 gap-2">
              {['ALL', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => (
                <button
                  key={group}
                  onClick={() => setFilters(prev => ({ ...prev, bloodGroup: group }))}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                    filters.bloodGroup === group
                      ? 'bg-rose-600 text-white'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-700'
                  }`}
                >
                  {group === 'ALL' ? s.any : group}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="filter-district" className="block text-xs font-semibold text-slate-500 mb-2">{s.district}</label>
            <CompactSelect
              id="filter-district"
              value={filters.district}
              onChange={district => setFilters(prev => ({ ...prev, district, area: 'ALL' }))}
              options={[{ value: 'ALL', label: s.allDistricts }, ...districts.map(dist => ({ value: dist.name, label: dist.name }))]}
            />
          </div>

          {filters.district !== 'ALL' && areasList.length > 0 && (
            <div className="animate-in fade-in duration-200">
              <label htmlFor="filter-area" className="block text-xs font-semibold text-slate-500 mb-2">{s.area}</label>
              <CompactSelect
                id="filter-area"
                value={filters.area}
                onChange={area => setFilters(prev => ({ ...prev, area }))}
                options={[{ value: 'ALL', label: s.allAreas }, ...areasList.map(area => ({ value: area, label: area }))]}
              />
            </div>
          )}

          {/* Everything below is a refinement most people never need, so it
              stays folded away. The distance slider was removed entirely: donor
              coordinates aren't real yet, so it filtered on a made-up number. */}
          <div>
            <button
              onClick={() => setShowMore(v => !v)}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              {showMore ? s.fewer : s.more}
            </button>

            {showMore && (
              <div className="mt-3 space-y-2 animate-in fade-in duration-200">
                <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-rose-300 dark:hover:border-rose-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={filters.availableNowOnly}
                    onChange={e => setFilters(prev => ({ ...prev, availableNowOnly: e.target.checked }))}
                    className="accent-rose-600 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{s.availableNow}</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-rose-300 dark:hover:border-rose-700 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={filters.regularOnly}
                    onChange={e => setFilters(prev => ({ ...prev, regularOnly: e.target.checked }))}
                    className="accent-rose-600 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{s.donatedBefore}</span>
                </label>

              </div>
            )}
          </div>

          {/* Results update as you choose, so there is no "search" step. The
              reset link only appears once something is actually filtered. */}
          {hasActiveFilters && (
            <button
              onClick={() => setFilters({
                bloodGroup: 'ALL',
                district: 'ALL',
                area: 'ALL',
                verifiedOnly: false,
                regularOnly: false,
                availableNowOnly: false,
                maxDistanceKm: 0
              })}
              className="w-full text-center py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              {s.clear}
            </button>
          )}
        </div>
      </section>

      {/* Next Eligible Date Reminder Widget */}
      {currentUser && (
        <section>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="bg-rose-50 dark:bg-rose-950/30 p-5 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-xs relative cursor-pointer"
          >
            <div className="flex justify-between items-start mb-1">
              <p className="text-rose-900 dark:text-rose-300 text-xs font-extrabold uppercase tracking-wide">{s.eligibility}</p>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            </div>

            <p className="text-rose-600 dark:text-rose-400 text-xl font-black italic editorial-title">
              {currentUser.nextEligibleDate ? formatDate(currentUser.nextEligibleDate, lang) : s.readyNow}
            </p>

            <p className="text-[11px] text-rose-800/80 dark:text-rose-400/80 mt-1.5 uppercase leading-snug font-medium">
              {f(s.savedSoFar, { count: currentUser.livesSaved ?? 0 })}
            </p>
          </motion.div>
        </section>
      )}
    </aside>
  );
};
