import { Building2, CheckCircle2, Clock, FileCheck, Plus, ShieldCheck, Users } from 'lucide-react';
import React, { useState } from 'react';
import { HOSPITAL_ACCOUNTS } from '../mockData';
import { EmergencyRequest } from '../types';

interface HospitalPortalProps {
  requests: EmergencyRequest[];
  onRequestBlood: () => void;
}

export const HospitalPortal: React.FC<HospitalPortalProps> = ({ requests, onRequestBlood }) => {
  const [selectedHospital, setSelectedHospital] = useState(HOSPITAL_ACCOUNTS[0]);
  const hospitalRequests = requests.filter(r => r.hospitalName === selectedHospital.name || r.id === 'req-1');

  return (
    <section className="p-6 lg:p-10 overflow-y-auto custom-scroll h-full bg-white space-y-10 pb-20">
      {/* Header */}
      <header className="border-b border-slate-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Hospital Portal
            </span>
            <span className="text-xs font-bold text-slate-400">• DGHS Accredited</span>
          </div>
          <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 leading-tight">
            Hospital Emergency <span className="text-rose-600">Operations.</span>
          </h1>
        </div>

        {/* Hospital Switcher */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
          <Building2 className="w-5 h-5 text-rose-600 ml-2" />
          <select
            value={selectedHospital.id}
            onChange={e => {
              const h = HOSPITAL_ACCOUNTS.find(acc => acc.id === e.target.value);
              if (h) setSelectedHospital(h);
            }}
            className="bg-transparent font-extrabold text-sm text-slate-800 outline-hidden pr-4 py-1 cursor-pointer"
          >
            {HOSPITAL_ACCOUNTS.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Hospital Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-lg">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Active Blood Requisitions</p>
          <p className="text-4xl font-mono font-black text-white">{hospitalRequests.length}</p>
          <p className="text-xs text-rose-400 font-bold mt-2">🚨 2 Critical Surgeries Pending</p>
        </div>

        <div className="bg-rose-50 p-6 rounded-3xl border border-rose-200/80">
          <p className="text-[10px] uppercase font-extrabold text-rose-800 tracking-wider mb-1">Verified Transfusions (This Month)</p>
          <p className="text-4xl font-mono font-black text-rose-600">38 Units</p>
          <p className="text-xs text-emerald-600 font-bold mt-2">✓ 100% Donor Health Pass Rate</p>
        </div>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider mb-1">On-Call Registered Donors</p>
            <p className="text-4xl font-mono font-black text-slate-900">142</p>
          </div>
          <button
            onClick={onRequestBlood}
            className="mt-4 w-full py-3 blood-gradient text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Issue Requisition
          </button>
        </div>
      </div>

      {/* Active Hospital Requisition Management */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Requisitions & Screening Roster</h2>
          <span className="text-xs font-bold text-slate-600">{selectedHospital.area} Sector</span>
        </div>

        <div className="space-y-4">
          {hospitalRequests.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4 pr-4">
                <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl font-mono font-black text-2xl flex items-center justify-center shrink-0">
                  {req.bloodGroup}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-slate-900">Patient: {req.patientName}</h3>
                    <span className="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded font-bold uppercase">{req.urgency}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Requirement: <strong className="text-slate-800">{req.requiredBags} Bags</strong> • Needed by {req.neededByTime}
                  </p>
                  <p className="text-xs text-slate-400 italic mt-0.5">"{req.reason}"</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                    <Users className="w-3.5 h-3.5" /> 3 Donors Checked In
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Ready for cross-match screening</p>
                </div>

                <button
                  onClick={() => alert(`Certificate of Donation verified and issued for requisition #${req.id}. Donor impact points credited (+150 pts).`)}
                  className="px-5 py-3 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  Verify & Issue Certificate
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
};
