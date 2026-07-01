import { Award, Filter, Heart, MapPin, Search } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';
import { BANGLADESH_DISTRICTS } from '../mockData';
import { DonorProfile, SearchFilters } from '../types';

interface SidebarStatsProps {
  currentUser: DonorProfile | null;
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  onSearch: () => void;
  donorsCount: number;
}

export const SidebarStats: React.FC<SidebarStatsProps> = ({
  currentUser,
  filters,
  setFilters,
  onSearch,
  donorsCount
}) => {
  const selectedDistrictObj = BANGLADESH_DISTRICTS.find(d => d.name === filters.district);
  const areasList = selectedDistrictObj ? selectedDistrictObj.areas : [];

  return (
    <aside className="border-r border-slate-200/80 p-6 lg:p-8 flex flex-col gap-8 bg-slate-50/70 overflow-y-auto">
      {/* Impact Score Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-400">Impact Score</h2>
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider bg-rose-100 px-2 py-0.5 rounded-full">
            Top 5%
          </span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="blood-gradient p-6 rounded-3xl text-white shadow-xl shadow-rose-200/60 relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          
          <p className="text-4xl font-black mb-1 tracking-tight font-mono">
            {currentUser?.impactScore?.toLocaleString() || '1,250'}
          </p>
          <p className="text-xs opacity-90 uppercase tracking-wider font-semibold">Lifeline Points Earned</p>
          
          <div className="mt-5 flex flex-wrap gap-2">
            <div className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
              <Award className="w-3 h-3 text-yellow-300" />
              {currentUser?.badges?.[1] || 'Gold Badge'}
            </div>
            <div className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-200 fill-rose-200" />
              {currentUser?.livesSaved || 3} Lives Saved
            </div>
          </div>
        </motion.div>
      </section>

      {/* Smart Search Filter Engine */}
      <section className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-rose-600" />
            Smart Search
          </h2>
          <span className="text-xs font-bold text-slate-700">{donorsCount} Active</span>
        </div>

        <div className="space-y-3.5">
          {/* Blood Group Select */}
          <div className="relative">
            <select 
              value={filters.bloodGroup}
              onChange={e => setFilters(prev => ({ ...prev, bloodGroup: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 appearance-none outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all cursor-pointer shadow-xs"
            >
              <option value="ALL">🩸 Any Blood Group</option>
              <option value="A+">Blood Group: A+</option>
              <option value="A-">Blood Group: A-</option>
              <option value="B+">Blood Group: B+</option>
              <option value="B-">Blood Group: B-</option>
              <option value="AB+">Blood Group: AB+</option>
              <option value="AB-">Blood Group: AB-</option>
              <option value="O+">Blood Group: O+</option>
              <option value="O-">Blood Group: O-</option>
            </select>
          </div>

          {/* District Select */}
          <div className="relative">
            <select 
              value={filters.district}
              onChange={e => setFilters(prev => ({ ...prev, district: e.target.value, area: 'ALL' }))}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 appearance-none outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all cursor-pointer shadow-xs"
            >
              <option value="ALL">📍 All Districts</option>
              {BANGLADESH_DISTRICTS.map(dist => (
                <option key={dist.name} value={dist.name}>{dist.name} District</option>
              ))}
            </select>
          </div>

          {/* Area Select (if District picked) */}
          {filters.district !== 'ALL' && areasList.length > 0 && (
            <div className="relative animate-in fade-in duration-200">
              <select 
                value={filters.area}
                onChange={e => setFilters(prev => ({ ...prev, area: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 appearance-none outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all cursor-pointer shadow-xs"
              >
                <option value="ALL">🏙️ All Areas in {filters.district}</option>
                {areasList.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          )}

          {/* Distance Radius Slider */}
          <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs">
            <div className="flex justify-between text-xs font-bold mb-2 text-slate-700">
              <span>Max Distance Radius</span>
              <span className="text-rose-600 font-mono">
                {filters.maxDistanceKm === 0 ? 'Any distance' : `${filters.maxDistanceKm} km`}
              </span>
            </div>
            <input 
              type="range"
              min="0"
              max="150"
              step="5"
              value={filters.maxDistanceKm}
              onChange={e => setFilters(prev => ({ ...prev, maxDistanceKm: Number(e.target.value) }))}
              className="w-full accent-rose-600 cursor-pointer"
            />
          </div>

          {/* Smart Checkboxes */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-3 p-3 bg-white border border-slate-200/90 rounded-xl cursor-pointer hover:border-rose-300 transition-colors shadow-2xs select-none">
              <input 
                type="checkbox" 
                checked={filters.availableNowOnly}
                onChange={e => setFilters(prev => ({ ...prev, availableNowOnly: e.target.checked }))}
                className="accent-rose-600 w-4 h-4 rounded-sm cursor-pointer" 
              />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-tight flex-1">Available Now Only</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </label>

            <label className="flex items-center gap-3 p-3 bg-white border border-slate-200/90 rounded-xl cursor-pointer hover:border-rose-300 transition-colors shadow-2xs select-none">
              <input 
                type="checkbox" 
                checked={filters.verifiedOnly}
                onChange={e => setFilters(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
                className="accent-rose-600 w-4 h-4 rounded-sm cursor-pointer" 
              />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Hospital Verified Only</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-white border border-slate-200/90 rounded-xl cursor-pointer hover:border-rose-300 transition-colors shadow-2xs select-none">
              <input 
                type="checkbox" 
                checked={filters.nonSmokerOnly}
                onChange={e => setFilters(prev => ({ ...prev, nonSmokerOnly: e.target.checked }))}
                className="accent-rose-600 w-4 h-4 rounded-sm cursor-pointer" 
              />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Non-Smoker Donors</span>
            </label>
          </div>

          {/* Search Trigger Button */}
          <button 
            onClick={onSearch}
            className="w-full py-4 blood-gradient text-white rounded-xl font-extrabold uppercase text-xs tracking-[0.1em] shadow-lg shadow-rose-500/30 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Search className="w-4 h-4" />
            Find Matching Donors
          </button>
          
          {/* Reset Filters */}
          <button
            onClick={() => setFilters({
              bloodGroup: 'ALL',
              district: 'ALL',
              area: 'ALL',
              verifiedOnly: false,
              nonSmokerOnly: false,
              regularOnly: false,
              availableNowOnly: false,
              maxDistanceKm: 0
            })}
            className="w-full text-center py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
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
            className="bg-rose-50 p-5 rounded-2xl border border-rose-200/80 shadow-xs relative cursor-pointer"
          >
            <div className="flex justify-between items-start mb-1">
              <p className="text-rose-900 text-xs font-extrabold uppercase tracking-wide">Eligibility Status</p>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            
            <p className="text-rose-600 text-xl font-black italic editorial-title">
              {currentUser.nextEligibleDate || 'Ready Now!'}
            </p>
            
            <p className="text-[11px] text-rose-800/80 mt-1.5 uppercase leading-snug font-medium">
              You've saved {currentUser.livesSaved || 3} lives this year on LifelineBD.
            </p>
          </motion.div>
        </section>
      )}
    </aside>
  );
};
