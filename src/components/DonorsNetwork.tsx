import { Award, Calendar, Heart, MapPin, MessageCircle, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { calculateDistanceKm, lookupCoordinates } from '../services/lifelineService';
import { DonorProfile, SearchFilters } from '../types';

interface DonorsNetworkProps {
  donors: DonorProfile[];
  filters: SearchFilters;
  onSelectDonor: (donor: DonorProfile) => void;
  onRequestBlood: () => void;
}

export const DonorsNetwork: React.FC<DonorsNetworkProps> = ({
  donors,
  filters,
  onSelectDonor,
  onRequestBlood
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [selectedMapPin, setSelectedMapPin] = useState<DonorProfile | null>(null);

  // Default map center
  const mapCenter = filters.district !== 'ALL' 
    ? lookupCoordinates(filters.district, filters.area !== 'ALL' ? filters.area : 'Banani') 
    : { lat: 23.7937, lng: 90.4066 };

  return (
    <section className="p-6 lg:p-10 overflow-hidden flex flex-col h-full bg-white">
      {/* Header Bar */}
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 bg-rose-50 text-rose-600 rounded-md border border-rose-200">
              Verified Donors Network
            </span>
            <span className="text-xs font-bold text-slate-400">• {donors.length} Ready</span>
          </div>
          <h1 className="editorial-title text-4xl sm:text-5xl text-slate-900 leading-tight">
            Lifeline Heroes <span className="text-rose-600">Near You.</span>
          </h1>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'grid' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📇 Directory Grid
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'map' 
                ? 'blood-gradient text-white shadow-md shadow-rose-500/20' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📍 Live Radar Map
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="flex-1 overflow-y-auto custom-scroll pr-2 pb-12">
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
                    className="group bg-white rounded-3xl border border-slate-200/80 p-6 hover:shadow-xl hover:border-rose-300 transition-all flex flex-col justify-between relative overflow-hidden shadow-xs"
                  >
                    {/* Top Blood Group Watermark */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50/80 rounded-bl-3xl flex items-center justify-center font-mono text-2xl font-black text-rose-600">
                      {donor.bloodGroup}
                    </div>

                    <div>
                      {/* Avatar + Info */}
                      <div className="flex items-start gap-3.5 mb-4 pr-16">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-rose-500/30 overflow-hidden shrink-0 shadow-xs relative">
                          <img src={donor.avatar} alt={donor.name} className="w-full h-full object-cover" />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-base text-slate-900 group-hover:text-rose-600 transition-colors line-clamp-1">
                              {donor.name}
                            </h3>
                            {donor.isVerified && (
                              <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" title="Hospital Verified Donor" />
                            )}
                          </div>
                          
                          <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            {donor.area}, {donor.district}
                          </p>

                          {distKm > 0 && (
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md mt-1.5 inline-block">
                              ~{distKm} km distance
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Pills */}
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                          donor.availableNow 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${donor.availableNow ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {donor.availableNow ? 'Available Now' : 'Resting'}
                        </span>

                        <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded-lg">
                          ⭐ {donor.impactScore} Pts
                        </span>

                        {!donor.isSmoker && (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                            🚭 Non-Smoker
                          </span>
                        )}
                      </div>

                      {/* Last Donated Meta */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between mb-6">
                        <span className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                          <Calendar className="w-3.5 h-3.5" />
                          Last Donated:
                        </span>
                        <span className="font-mono font-bold text-slate-800">{donor.lastDonationDate || 'First time'}</span>
                      </div>
                    </div>

                    {/* Action CTAs */}
                    <div className="flex gap-2">
                      <a
                        href={`https://wa.me/${donor.whatsapp}?text=${encodeURIComponent(
                          `🩸 Hi ${donor.name}, I found your verified donor profile on LifelineBD (${donor.bloodGroup}). Are you available for a blood donation?`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-rose-600 transition-colors text-center flex items-center justify-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>

                      <a
                        href={`tel:${donor.phone}`}
                        className="p-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-center flex items-center justify-center transition-colors"
                        title="Call Donor"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => onSelectDonor(donor)}
                        className="px-3.5 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors"
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
                <img src={selectedMapPin.avatar} alt="" className="w-12 h-12 rounded-xl border border-rose-500 object-cover bg-slate-700" />
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
                <a
                  href={`https://wa.me/${selectedMapPin.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 blood-gradient rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  WhatsApp
                </a>
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
