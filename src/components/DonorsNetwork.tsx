import { Award, Calendar, Heart, MapPin, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { calculateAge, calculateDistanceKm, lookupCoordinates } from '../services/lifelineService';
import { DonorProfile, SearchFilters } from '../types';
import { Avatar } from './Avatar';

interface DonorsNetworkProps {
  donors: DonorProfile[];
  filters: SearchFilters;
  onSelectDonor: (donor: DonorProfile) => void;
  onRequestBlood: () => void;
  initialViewMode?: 'grid' | 'map';
}

export const DonorsNetwork: React.FC<DonorsNetworkProps> = ({
  donors,
  filters,
  onSelectDonor,
  onRequestBlood,
  initialViewMode = 'grid'
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(initialViewMode);
  const [selectedMapPin, setSelectedMapPin] = useState<DonorProfile | null>(null);

  // Default map center
  const mapCenter = filters.district !== 'ALL' 
    ? lookupCoordinates(filters.district, filters.area !== 'ALL' ? filters.area : 'Banani') 
    : { lat: 23.7937, lng: 90.4066 };

  return (
    <section className="p-6 lg:p-10 lg:overflow-hidden flex flex-col lg:h-full bg-white min-w-0">
      {/* Header Bar */}
      {/* The count is the only status worth stating, so it sits in the heading
          rather than in a decorative badge above it. */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Donors</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {donors.length === 0
              ? 'No donors match these filters'
              : `${donors.length} donor${donors.length === 1 ? '' : 's'} match your filters`}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Map
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="flex-1 lg:overflow-y-auto custom-scroll lg:pr-2 pb-12">
          {donors.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-slate-200/80 p-8">
              <Sparkles className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-extrabold text-slate-800">No Donors Match Your Current Filters</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
                Try widening your distance radius, removing specific health constraints, or posting an emergency request to broadcast across all districts.
              </p>
              <button
                onClick={onRequestBlood}
                className="mt-6 px-6 py-3.5 blood-gradient text-white font-black uppercase text-xs rounded-xl shadow-lg"
              >
                🚨 Broadcast Emergency Request
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {donors.map(donor => {
                const distKm = calculateDistanceKm(mapCenter.lat, mapCenter.lng, donor.lat, donor.lng);
                return (
                  <div
                    key={donor.id}
                    className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-rose-300 hover:shadow-lg transition-all flex flex-col"
                  >
                    {/* The blood group is the one thing someone is scanning for,
                        so it anchors the card instead of hiding in a corner. */}
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-16 h-16 rounded-xl bg-rose-50 border border-rose-100 flex flex-col items-center justify-center">
                        <span className="font-mono text-xl font-black text-rose-600 leading-none">
                          {donor.bloodGroup}
                        </span>
                        {calculateAge(donor.birthYear) !== null && (
                          <span className="font-mono text-[9px] font-bold text-rose-400 mt-0.5">{calculateAge(donor.birthYear)}y</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 truncate">{donor.name}</h3>
                        </div>

                        <p className="text-sm text-slate-500 truncate mt-0.5">
                          {[donor.area, donor.district].filter(Boolean).join(', ') || 'Location not set'}
                        </p>

                        <p className="text-xs text-slate-400 mt-1.5">
                          {donor.availableNow ? (
                            <span className="text-emerald-600 font-semibold">Available now</span>
                          ) : (
                            <span>Not available</span>
                          )}
                          {donor.donationCount
                            ? ` · donated ${donor.donationCount}\u00d7`
                            : ' · first-time donor'}
                        </p>

                        {donor.lastDonationDate && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Last donated: {donor.lastDonationDate}</p>
                        )}
                        {!donor.availableNow && donor.nextEligibleDate && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Available from: {donor.nextEligibleDate}</p>
                        )}
                      </div>
                    </div>

                    {/* One action, and it does the actual job. */}
                    <div className="mt-4 flex items-center gap-2">
                      {donor.availableNow && donor.phone ? (
                        <a
                          href={`tel:${donor.phone}`}
                          className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold text-center transition-colors"
                        >
                          Call
                        </a>
                      ) : (
                        <span className="flex-1 py-2.5 bg-slate-50 text-slate-400 rounded-xl text-sm font-semibold text-center">
                          {donor.availableNow ? 'No number' : 'Off duty'}
                        </span>
                      )}

                      <button
                        onClick={() => onSelectDonor(donor)}
                        className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-rose-600 transition-colors"
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Interactive Radar Map View */
        <div className="flex-1 bg-slate-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden flex flex-col shadow-2xl pb-12">
          {/* Radar Grid Background */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(#E11D48 1.5px, transparent 1.5px), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }} />

          {/* Map Overlay Header */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider font-mono">
                Active Sector: {filters.district !== 'ALL' ? filters.district : 'Dhaka Central'} Radar
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Showing real-time donor telemetry in approximately 10km radius.
            </p>
          </div>

          {/* Radar Stage Pins */}
          <div className="flex-1 relative my-6 border border-slate-800 rounded-3xl bg-slate-950/40 overflow-hidden flex items-center justify-center">
            {/* Center User Pin */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group">
              <div className="w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full" />
              </div>
              <span className="bg-slate-900 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border border-slate-700 mt-1 shadow-lg">
                📍 You ({filters.district !== 'ALL' ? filters.district : 'Dhaka'})
              </span>
            </div>

            {/* Simulated Radar Circles */}
            <div className="absolute w-64 h-64 border border-rose-500/20 rounded-full animate-ping duration-1000 pointer-events-none" />
            <div className="absolute w-96 h-96 border border-slate-800 rounded-full pointer-events-none" />
            <div className="absolute w-[32rem] h-[32rem] border border-slate-800/60 rounded-full pointer-events-none" />

            {/* Render Donors as Map Pins */}
            {donors.map((donor, idx) => {
              // Calculate relative positions on radar canvas
              const angle = (idx * (360 / Math.max(1, donors.length))) * (Math.PI / 180);
              const radiusPercent = 18 + (idx % 3) * 12; // Spread out
              const leftPercent = 50 + Math.cos(angle) * radiusPercent;
              const topPercent = 50 + Math.sin(angle) * radiusPercent;

              return (
                <div
                  key={donor.id}
                  style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                  onClick={() => setSelectedMapPin(donor)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 group flex flex-col items-center hover:z-50 transition-all"
                >
                  <div className={`w-9 h-9 rounded-2xl font-mono text-xs font-black flex items-center justify-center shadow-xl border-2 transition-transform group-hover:scale-125 ${
                    donor.availableNow 
                      ? 'blood-gradient text-white border-white' 
                      : 'bg-slate-800 text-slate-300 border-slate-600'
                  }`}>
                    {donor.bloodGroup}
                  </div>
                  
                  <span className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-rose-500 mt-1 whitespace-nowrap shadow-2xl transition-opacity">
                    {donor.name} ({donor.area})
                  </span>
                </div>
              );
            })}
          </div>

          {/* Map Pin Detail Card Overlay */}
          {selectedMapPin && (
            <div className="relative z-30 bg-slate-800 border border-slate-700 p-5 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-200 shadow-2xl">
              <div className="flex items-center gap-4">
                <Avatar name={selectedMapPin.name} src={selectedMapPin.avatar} className="w-12 h-12" />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-base">{selectedMapPin.name}</h4>
                    <span className="text-[10px] bg-rose-600 px-2 py-0.5 rounded font-mono font-bold">{selectedMapPin.bloodGroup}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    📍 {selectedMapPin.area}, {selectedMapPin.district} • ⭐ {selectedMapPin.impactScore} pts
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="px-4 py-2.5 bg-slate-700 text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider">
                  Contact private
                </span>
                <button
                  onClick={() => onSelectDonor(selectedMapPin)}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Full Profile
                </button>
                <button
                  onClick={() => setSelectedMapPin(null)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
