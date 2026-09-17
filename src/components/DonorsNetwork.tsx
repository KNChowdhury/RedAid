import { Award, Calendar, Heart, MapPin, MessageCircle, Sparkles } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { APIProvider, AdvancedMarker, Map, Pin } from '@vis.gl/react-google-maps';
import { calculateAge, calculateDistanceKm, getDonorContact, getWhatsAppUrl, lookupCoordinates } from '../services/lifelineService';
import { DonorProfile, SearchFilters } from '../types';
import { Avatar } from './Avatar';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface DonorsNetworkProps {
  donors: DonorProfile[];
  filters: SearchFilters;
  currentUserId: string | null;
  onSelectDonor: (donor: DonorProfile) => void;
  onRequestBlood: () => void;
  onRequireAuth: () => void;
  initialViewMode?: 'grid' | 'map';
}

export const DonorsNetwork: React.FC<DonorsNetworkProps> = ({
  donors,
  filters,
  currentUserId,
  onSelectDonor,
  onRequestBlood,
  onRequireAuth,
  initialViewMode = 'grid'
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(initialViewMode);
  const [selectedMapPin, setSelectedMapPin] = useState<DonorProfile | null>(null);
  const [revealedContacts, setRevealedContacts] = useState<Record<string, { phone: string | null; whatsapp: string | null }>>({});
  const [revealingDonorId, setRevealingDonorId] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const revealRequestVersionRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    revealRequestVersionRef.current += 1;
    setRevealedContacts({});
    setRevealingDonorId(null);
  }, [currentUserId]);

  // Default map center
  const mapCenter = filters.district !== 'ALL' 
    ? lookupCoordinates(filters.district, filters.area !== 'ALL' ? filters.area : 'Banani') 
    : { lat: 23.7937, lng: 90.4066 };

  const revealContact = async (donorId: string) => {
    if (revealingDonorId || !isMountedRef.current) return;
    if (!currentUserId) {
      onRequireAuth();
      return;
    }
    const requestVersion = revealRequestVersionRef.current;
    setRevealingDonorId(donorId);
    const contact = await getDonorContact(donorId);
    if (!isMountedRef.current || requestVersion !== revealRequestVersionRef.current) return;
    setRevealedContacts(prev => ({ ...prev, [donorId]: contact || { phone: null, whatsapp: null } }));
    setRevealingDonorId(null);
  };

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
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            Last donated <span className="font-bold text-slate-700">{donor.lastDonationDate}</span>
                          </p>
                        )}
                        {!donor.availableNow && donor.nextEligibleDate && (
                          <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 mt-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 w-fit">
                            <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            Available from <span className="font-black">{donor.nextEligibleDate}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* One action, and it does the actual job. */}
                    <div className="mt-4 flex items-center gap-2">
                      {donor.availableNow ? (
                        revealedContacts[donor.id]?.phone ? (
                          <div className="flex-1 flex items-center gap-2">
                            <a href={`tel:${revealedContacts[donor.id].phone}`} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold text-center transition-colors">
                              {revealedContacts[donor.id].phone}
                            </a>
                            {revealedContacts[donor.id]?.whatsapp && getWhatsAppUrl(revealedContacts[donor.id].whatsapp, 'Hello, I found your number on Roktobondhu Bangladesh. Can you help?') && (
                              <a
                                href={getWhatsAppUrl(revealedContacts[donor.id].whatsapp, 'Hello, I found your number on Roktobondhu Bangladesh. Can you help?') || undefined}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Message ${donor.name} on WhatsApp`}
                                className="w-11 h-11 inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        ) : revealedContacts[donor.id] ? (
                          <span className="flex-1 py-2.5 bg-slate-50 text-slate-400 rounded-xl text-sm font-semibold text-center">Not available right now</span>
                        ) : (
                          <button onClick={() => revealContact(donor.id)} disabled={revealingDonorId !== null} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold text-center transition-colors disabled:opacity-60">
                            {revealingDonorId === donor.id ? 'Checking...' : 'Show number'}
                          </button>
                        )
                      ) : (
                        <span className="flex-1 py-2.5 bg-slate-50 text-slate-400 rounded-xl text-sm font-semibold text-center">Not available right now</span>
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
      ) : !GOOGLE_MAPS_API_KEY ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-[2.5rem] border border-slate-200 p-10 text-center">
          <p className="text-sm font-semibold text-slate-500 max-w-sm">
            Map view needs a Google Maps API key. Set <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> and reload.
          </p>
        </div>
      ) : (
        /* Real Google Map, donors plotted at their actual coordinates */
        <div className="flex-1 rounded-[2.5rem] relative overflow-hidden shadow-2xl flex flex-col pb-0">
          <div className="flex-1 relative">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                mapId="lifelinebd-donor-map"
                defaultCenter={mapCenter}
                defaultZoom={12}
                gestureHandling="greedy"
                disableDefaultUI={false}
                style={{ width: '100%', height: '100%' }}
              >
                <AdvancedMarker position={mapCenter}>
                  <div className="w-4 h-4 bg-blue-600 rounded-full border-4 border-white shadow-xl" />
                </AdvancedMarker>

                {donors.filter(d => d.lat && d.lng).map(donor => (
                  <AdvancedMarker
                    key={donor.id}
                    position={{ lat: donor.lat, lng: donor.lng }}
                    onClick={() => setSelectedMapPin(donor)}
                  >
                    <Pin
                      background={donor.availableNow ? '#e11d48' : '#64748b'}
                      borderColor="#ffffff"
                      glyphColor="#ffffff"
                      glyphText={donor.bloodGroup}
                    />
                  </AdvancedMarker>
                ))}
              </Map>
            </APIProvider>
          </div>

          {/* Map Pin Detail Card Overlay */}
          {selectedMapPin && (
            <div className="relative z-30 bg-slate-800 text-white border border-slate-700 p-5 rounded-b-[2.5rem] flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-200 shadow-2xl">
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
