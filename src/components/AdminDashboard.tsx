import { Activity, AlertTriangle, BarChart3, CheckCircle2, FileText, Shield, Trash2, UserCheck, Users } from 'lucide-react';
import React, { useState } from 'react';
import { formatRequestDeadline } from '../services/lifelineService';
import { DonorProfile, EmergencyRequest } from '../types';
import { Avatar } from './Avatar';

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

  const fulfilledRequests = requests.filter(r => r.status === 'Fulfilled').length;
  const fulfillmentRate = requests.length > 0 ? Math.round((fulfilledRequests / requests.length) * 100) : 0;
  const verifiedHospitalCount = donors.filter(d => d.role === 'hospital' && d.isVerified).length;
  const totalLivesSaved = donors.reduce((sum, d) => sum + (d.livesSaved ?? 0), 0);

  return (
    <section className="p-6 lg:p-10 overflow-y-auto custom-scroll h-full bg-white dark:bg-slate-900 space-y-10 pb-20">
      {/* Header */}
      <header className="border-b border-slate-100 dark:border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1 w-max">
            <Shield className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            System Control Plane
          </span>
          <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 dark:text-slate-100 leading-tight mt-3">
            Admin Governance &<br />
            <span className="text-rose-600 dark:text-rose-400">Analytics.</span>
          </h1>
        </div>

        {/* Sub Navigation */}
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-max">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'overview' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500'
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'users' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500'
            }`}
          >
            👥 Users ({donors.length})
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'requests' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500'
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
            <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-6 rounded-3xl shadow-xl">
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-600 tracking-wider">Total Network Users</p>
              <p className="text-3xl font-mono font-black mt-2">{donors.length}</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 font-bold mt-1">Registered donor accounts</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/30 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/50">
              <p className="text-[10px] uppercase font-extrabold text-rose-800 dark:text-rose-400 tracking-wider">Emergency Fulfillment</p>
              <p className="text-3xl font-mono font-black text-rose-600 dark:text-rose-400">{fulfillmentRate}%</p>
              <p className="text-xs text-rose-700 dark:text-rose-400 font-bold mt-1">{fulfilledRequests} of {requests.length} requisitions fulfilled</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Verified Hospital Nodes</p>
              <p className="text-3xl font-mono font-black text-slate-900 dark:text-slate-100">{verifiedHospitalCount}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold mt-1">Verified hospital accounts</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-900/50">
              <p className="text-[10px] uppercase font-extrabold text-emerald-800 dark:text-emerald-400 tracking-wider">Lives Saved Telemetry</p>
              <p className="text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400">{totalLivesSaved.toLocaleString()}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">Every drop counts</p>
            </div>
          </div>

          {/* Simulated Charts Panel */}
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <BarChart3 className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Blood Group Demand Index
              </h3>
              <div className="space-y-4 font-mono text-xs font-bold">
                <div>
                  <div className="flex justify-between mb-1"><span>O- (Universal Donor)</span><span>34% Demand</span></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full blood-gradient w-[34%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span>B+ (Most Common in BD)</span><span>28% Demand</span></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-rose-500 w-[28%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span>AB+ (Rare Demand)</span><span>15% Demand</span></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-rose-400 w-[15%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span>A- (Critical Shortage)</span><span>23% Demand</span></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-amber-500 w-[23%]" /></div>
                </div>
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
            <div key={donor.id} className="bg-white dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar name={donor.name} src={donor.avatar} className="w-10 h-10" textClassName="text-xs" />
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{donor.name}</p>
                  <p className="text-xs text-slate-500 font-mono truncate">{donor.email} • {donor.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{donor.bloodGroup}</span>
                <span className="text-xs font-semibold text-slate-500">
                  {donor.donationCount ?? 0} donation{(donor.donationCount ?? 0) === 1 ? '' : 's'}
                </span>
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
            <div key={req.id} className="bg-white dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl font-mono font-bold flex items-center justify-center shrink-0 text-sm">
                  {req.bloodGroup}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{req.hospitalName} ({req.patientName})</p>
                  <p className="text-xs text-slate-500 truncate">{req.area}, {req.district} • Needed: {formatRequestDeadline(req.neededByTime, req.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                  req.urgency === 'Critical' ? 'bg-rose-600 text-white' : 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400'
                }`}>{req.urgency}</span>
                <button
                  onClick={() => onDeleteRequest(req.id)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
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
