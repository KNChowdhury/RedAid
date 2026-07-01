import { AlertCircle, Clock, MapPin, Phone, Share2, ShieldCheck, Users } from 'lucide-react';
import React from 'react';
import { EmergencyRequest } from '../types';

interface EmergencyFeedProps {
  requests: EmergencyRequest[];
  onSelectRequest: (req: EmergencyRequest) => void;
  onRequestBlood: () => void;
}

export const EmergencyFeed: React.FC<EmergencyFeedProps> = ({
  requests,
  onSelectRequest,
  onRequestBlood
}) => {
  return (
    <section className="p-6 lg:p-10 overflow-hidden flex flex-col h-full bg-white">
      {/* Editorial Title Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 leading-none mb-3">
            Every Drop<br />
            <span className="text-rose-600">Saves a Life.</span>
          </h1>
          <p className="text-slate-400 font-bold max-w-lg uppercase text-[11px] tracking-widest">
            Real-time emergency blood requests across Bangladesh hospitals.
          </p>
        </div>

        <button
          onClick={onRequestBlood}
          className="sm:hidden py-3 px-6 blood-gradient text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md flex items-center justify-center gap-2"
        >
          <AlertCircle className="w-4 h-4 animate-bounce" />
          Post Urgent Request
        </button>
      </header>

      {/* Requests List Feed */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scroll pb-12">
        {requests.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-100">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-800">No Active Emergency Requests</h3>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">All hospital requirements in this area are fulfilled.</p>
          </div>
        ) : (
          requests.map(req => {
            const isCritical = req.urgency === 'Critical';
            return (
              <div
                key={req.id}
                className={`group bg-white p-6 sm:p-7 rounded-[2.2rem] border transition-all relative overflow-hidden ${
                  req.status === 'Fulfilled' 
                    ? 'border-slate-100 opacity-60 grayscale-[0.4]' 
                    : isCritical 
                    ? 'border-rose-200/80 shadow-md shadow-rose-500/5 hover:shadow-xl hover:border-rose-300' 
                    : 'border-slate-100 shadow-xs hover:shadow-lg'
                }`}
              >
                {/* Blood Group Watermark Badge */}
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full flex items-center justify-center pl-6 pb-6 ${
                  isCritical ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-700'
                }`}>
                  <span className="font-black text-2xl font-mono">{req.bloodGroup}</span>
                </div>

                <div className="flex items-start gap-4 mb-4 pr-20">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    isCritical ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <AlertCircle className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-lg sm:text-xl text-slate-900">{req.hospitalName}</h3>
                      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${
                        isCritical ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.urgency} Priority
                      </span>
                    </div>

                    <p className="text-slate-400 text-xs uppercase font-bold tracking-wider flex items-center gap-2 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      {req.area}, {req.district}
                      <span className="text-slate-300">•</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      Needed: <span className="text-rose-600 font-extrabold">{req.neededByTime}</span>
                    </p>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-slate-700 mb-6 font-semibold leading-relaxed">
                  <span className="text-slate-900 font-bold">Patient: {req.patientName} ({req.age}y).</span> Requirement for{' '}
                  <span className="text-rose-600 font-black underline decoration-rose-300 decoration-2">{req.requiredBags} Bags</span> of {req.bloodGroup} blood. {req.reason}
                </p>

                {/* Footer Meta & Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200/60">
                      <Users className="w-3.5 h-3.5" />
                      {req.matchedDonorsCount} Compatible Donors Nearby
                    </span>
                  </div>

                  <div className="flex gap-2.5 w-full sm:w-auto">
                    <a
                      href={`https://wa.me/${req.contactWhatsapp}?text=${encodeURIComponent(
                        `🚨 Hi, I saw your urgent request on LifelineBD for ${req.requiredBags} bags of ${req.bloodGroup} blood for ${req.patientName} at ${req.hospitalName}. I am available to donate.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-initial px-5 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-600 transition-colors text-center shadow-sm flex items-center justify-center gap-1.5"
                    >
                      WhatsApp
                    </a>

                    <a
                      href={`tel:${req.contactPhone}`}
                      className="px-5 py-3 border-2 border-slate-200 text-slate-800 rounded-xl text-[11px] font-black uppercase tracking-widest hover:border-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call
                    </a>

                    <button
                      onClick={() => onSelectRequest(req)}
                      className="px-4 py-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors"
                      title="View Details / Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
