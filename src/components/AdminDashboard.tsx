import { Activity, AlertTriangle, BarChart3, CheckCircle2, FileText, Shield, Trash2, UserCheck, Users } from 'lucide-react';
import React, { useState } from 'react';
import { DonorProfile, EmergencyRequest } from '../types';

interface AdminDashboardProps {
  donors: DonorProfile[];
  requests: EmergencyRequest[];
  onDeleteRequest: (id: string) => void;
  onToggleVerifyUser: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  donors,
  requests,
  onDeleteRequest,
  onToggleVerifyUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'users' | 'requests'>('overview');

  const totalDonations = 245;
  const fulfilledRequests = requests.filter(r => r.status === 'Fulfilled').length;

  return (
    <section className="p-6 lg:p-10 overflow-y-auto custom-scroll h-full bg-white space-y-10 pb-20">
      {/* Header */}
      <header className="border-b border-slate-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1 w-max">
            <Shield className="w-3.5 h-3.5 text-rose-600" />
            System Control Plane
          </span>
          <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 leading-tight mt-3">
            Admin Governance &<br />
            <span className="text-rose-600">Analytics.</span>
          </h1>
        </div>

        {/* Sub Navigation */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-max">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            👥 Users ({donors.length})
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'requests' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            🚨 Requisitions ({requests.length})
          </button>
        </div>
      </header>

      {/* Overview Analytics View */}
      {activeSubTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Network Users</p>
              <p className="text-3xl font-mono font-black mt-2">{donors.length + 180}</p>
              <p className="text-xs text-emerald-400 font-bold mt-1">↑ 18% growth this month</p>
            </div>
            <div className="bg-rose-50 p-6 rounded-3xl border border-rose-200">
              <p className="text-[10px] uppercase font-extrabold text-rose-800 tracking-wider">Emergency Fulfillment</p>
              <p className="text-3xl font-mono font-black text-rose-600">92.4%</p>
              <p className="text-xs text-rose-700 font-bold mt-1">Avg response time: 14 mins</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <p className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Verified Hospital Nodes</p>
              <p className="text-3xl font-mono font-black text-slate-900">42</p>
              <p className="text-xs text-slate-600 font-bold mt-1">Across 8 Divisions</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-200">
              <p className="text-[10px] uppercase font-extrabold text-emerald-800 tracking-wider">Lives Saved Telemetry</p>
              <p className="text-3xl font-mono font-black text-emerald-600">1,480+</p>
              <p className="text-xs text-emerald-700 font-bold mt-1">Every drop counts</p>
            </div>
          </div>

          {/* Simulated Charts Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200">
              <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-slate-800">
                <BarChart3 className="w-4 h-4 text-rose-600" /> Blood Group Demand Index
              </h3>
              <div className="space-y-4 font-mono text-xs font-bold">
                <div>
                  <div className="flex justify-between mb-1"><span>O- (Universal Donor)</span><span>34% Demand</span></div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden"><div className="h-full blood-gradient w-[34%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span>B+ (Most Common in BD)</span><span>28% Demand</span></div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-rose-500 w-[28%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span>AB+ (Rare Demand)</span><span>15% Demand</span></div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-rose-400 w-[15%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span>A- (Critical Shortage)</span><span>23% Demand</span></div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-amber-500 w-[23%]" /></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden shadow-2xl">
              <div>
                <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-black uppercase">
                  ● Django Backend Health
                </span>
                <h3 className="text-2xl font-black mt-3 editorial-title">API Infrastructure Status</h3>
                <p className="text-xs text-slate-400 mt-1">PostgreSQL Connection pool & Firebase Cloud Messaging (FCM) push worker thread status.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 my-6 font-mono text-xs">
                <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                  <span className="text-slate-400 block text-[10px]">DB LATENCY</span>
                  <span className="text-emerald-400 font-black text-sm">4.2 ms</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
                  <span className="text-slate-400 block text-[10px]">FCM PUSH</span>
                  <span className="text-emerald-400 font-black text-sm">ACTIVE</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-3 flex justify-between font-bold">
                <span>SECURITY: JWT Auth Validated</span>
                <span>CACHE: Redis OK</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Governance Roster */}
      {activeSubTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">User Screening & Verification Roster</h3>
          {donors.map(donor => (
            <div key={donor.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4 min-w-0">
                <img src={donor.avatar} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{donor.name}</p>
                  <p className="text-xs text-slate-500 font-mono truncate">{donor.email} • {donor.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold font-mono bg-slate-100 px-2 py-1 rounded">{donor.bloodGroup}</span>
                <button
                  onClick={() => onToggleVerifyUser(donor.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-colors ${
                    donor.isVerified ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-700' : 'bg-slate-900 text-white hover:bg-emerald-600'
                  }`}
                >
                  {donor.isVerified ? '✓ Verified (Revoke)' : 'Grant Verify'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Requests Moderation */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Active Emergency Broadcasts Governance</h3>
          {requests.map(req => (
            <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl font-mono font-bold flex items-center justify-center shrink-0 text-sm">
                  {req.bloodGroup}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{req.hospitalName} ({req.patientName})</p>
                  <p className="text-xs text-slate-500 truncate">{req.area}, {req.district} • Needed: {req.neededByTime}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                  req.urgency === 'Critical' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                }`}>{req.urgency}</span>
                <button
                  onClick={() => onDeleteRequest(req.id)}
                  className="p-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 rounded-xl text-slate-600 transition-colors cursor-pointer"
                  title="Remove Spam / Expired Request"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
