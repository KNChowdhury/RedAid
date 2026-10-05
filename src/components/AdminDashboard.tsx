import { Activity, AlertTriangle, BarChart3, CheckCircle2, FileText, Shield, Trash2, UserCheck, Users } from 'lucide-react';
import React, { useState } from 'react';
import { defineStrings, formatNumber, useStrings } from '../i18n';
import { formatRequestDeadline } from '../services/lifelineService';
import { DonorProfile, EmergencyRequest } from '../types';
import { Avatar } from './Avatar';

const S = defineStrings(
  {
    controlPlane: 'System Control Plane',
    titleLine1: 'Admin Governance &',
    titleLine2: 'Analytics.',
    tabAnalytics: '📊 Analytics',
    tabUsers: '👥 Users ({count})',
    tabRequests: '🚨 Requisitions ({count})',
    totalUsers: 'Total Network Users',
    totalUsersSub: 'Registered donor accounts',
    fulfillment: 'Emergency Fulfillment',
    fulfillmentSub: '{done} of {total} requisitions fulfilled',
    verifiedHospitals: 'Verified Hospital Nodes',
    verifiedHospitalsSub: 'Verified hospital accounts',
    livesSaved: 'Lives Saved Telemetry',
    livesSavedSub: 'Every drop counts',
    demandIndex: 'Blood Group Demand Index',
    demandONeg: 'O- (Universal Donor)',
    demandBPos: 'B+ (Most Common in BD)',
    demandABPos: 'AB+ (Rare Demand)',
    demandANeg: 'A- (Critical Shortage)',
    demandPercent: '{percent}% Demand',
    usersHeading: 'User Screening & Verification Roster',
    donationOne: '{count} donation',
    donationMany: '{count} donations',
    requestsHeading: 'Active Emergency Broadcasts Governance',
    neededBy: 'Needed: {deadline}',
    // Urgency values are stored codes; English shows the code as before.
    urgencyCritical: 'Critical',
    urgencyHigh: 'High',
    urgencyMedium: 'Medium',
    deleteRequest: 'Remove Spam / Expired Request'
  },
  {
    controlPlane: 'সিস্টেম নিয়ন্ত্রণ',
    titleLine1: 'অ্যাডমিন পরিচালনা ও',
    titleLine2: 'বিশ্লেষণ।',
    tabAnalytics: '📊 বিশ্লেষণ',
    tabUsers: '👥 ব্যবহারকারী ({count})',
    tabRequests: '🚨 অনুরোধ ({count})',
    totalUsers: 'মোট ব্যবহারকারী',
    totalUsersSub: 'নিবন্ধিত রক্তদাতা অ্যাকাউন্ট',
    fulfillment: 'জরুরি অনুরোধ পূরণ',
    fulfillmentSub: '{total}টির মধ্যে {done}টি অনুরোধ পূরণ হয়েছে',
    verifiedHospitals: 'ভেরিফায়েড হাসপাতাল',
    verifiedHospitalsSub: 'ভেরিফায়েড হাসপাতাল অ্যাকাউন্ট',
    livesSaved: 'মোট বাঁচানো জীবন',
    livesSavedSub: 'প্রতিটি ফোঁটাই মূল্যবান',
    demandIndex: 'ব্লাড গ্রুপ চাহিদা সূচক',
    demandONeg: 'O- (সর্বজনীন দাতা)',
    demandBPos: 'B+ (বাংলাদেশে সবচেয়ে বেশি)',
    demandABPos: 'AB+ (কম চাহিদা)',
    demandANeg: 'A- (তীব্র সংকট)',
    demandPercent: '{percent}% চাহিদা',
    usersHeading: 'ব্যবহারকারী যাচাই ও ভেরিফিকেশন তালিকা',
    donationOne: '{count}টি রক্তদান',
    donationMany: '{count}টি রক্তদান',
    requestsHeading: 'সক্রিয় জরুরি অনুরোধ পরিচালনা',
    neededBy: 'কখন লাগবে: {deadline}',
    urgencyCritical: 'অতি জরুরি',
    urgencyHigh: 'জরুরি',
    urgencyMedium: 'সাধারণ',
    deleteRequest: 'স্প্যাম / মেয়াদোত্তীর্ণ অনুরোধ মুছুন'
  }
);

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
  const { s, f, lang } = useStrings(S);

  // English keeps exactly the digits it showed before (no added grouping);
  // Bangla mode writes numbers in Bangla digits.
  const num = (value: number) => (lang === 'bn' ? formatNumber(value, lang) : String(value));

  const URGENCY_LABEL: Record<string, string> = {
    Critical: s.urgencyCritical,
    High: s.urgencyHigh,
    Medium: s.urgencyMedium
  };

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
            {s.controlPlane}
          </span>
          <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 dark:text-slate-100 leading-tight mt-3">
            {s.titleLine1}<br />
            <span className="text-rose-600 dark:text-rose-400">{s.titleLine2}</span>
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
            {s.tabAnalytics}
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'users' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500'
            }`}
          >
            {f(s.tabUsers, { count: num(donors.length) })}
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'requests' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500'
            }`}
          >
            {f(s.tabRequests, { count: num(requests.length) })}
          </button>
        </div>
      </header>

      {/* Overview Analytics View */}
      {activeSubTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-6 rounded-3xl shadow-xl">
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-600 tracking-wider">{s.totalUsers}</p>
              <p className="text-3xl font-mono font-black mt-2">{num(donors.length)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 font-bold mt-1">{s.totalUsersSub}</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/30 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/50">
              <p className="text-[10px] uppercase font-extrabold text-rose-800 dark:text-rose-400 tracking-wider">{s.fulfillment}</p>
              <p className="text-3xl font-mono font-black text-rose-600 dark:text-rose-400">{num(fulfillmentRate)}%</p>
              <p className="text-xs text-rose-700 dark:text-rose-400 font-bold mt-1">{f(s.fulfillmentSub, { done: num(fulfilledRequests), total: num(requests.length) })}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">{s.verifiedHospitals}</p>
              <p className="text-3xl font-mono font-black text-slate-900 dark:text-slate-100">{num(verifiedHospitalCount)}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold mt-1">{s.verifiedHospitalsSub}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-900/50">
              <p className="text-[10px] uppercase font-extrabold text-emerald-800 dark:text-emerald-400 tracking-wider">{s.livesSaved}</p>
              <p className="text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400">{lang === 'bn' ? formatNumber(totalLivesSaved, lang) : totalLivesSaved.toLocaleString()}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">{s.livesSavedSub}</p>
            </div>
          </div>

          {/* Simulated Charts Panel */}
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-black uppercase tracking-wider mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <BarChart3 className="w-4 h-4 text-rose-600 dark:text-rose-400" /> {s.demandIndex}
              </h3>
              <div className="space-y-4 font-mono text-xs font-bold">
                <div>
                  <div className="flex justify-between mb-1"><span>{s.demandONeg}</span><span>{f(s.demandPercent, { percent: num(34) })}</span></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full blood-gradient w-[34%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span>{s.demandBPos}</span><span>{f(s.demandPercent, { percent: num(28) })}</span></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-rose-500 w-[28%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span>{s.demandABPos}</span><span>{f(s.demandPercent, { percent: num(15) })}</span></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-rose-400 w-[15%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1"><span>{s.demandANeg}</span><span>{f(s.demandPercent, { percent: num(23) })}</span></div>
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
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">{s.usersHeading}</h3>
          {donors.map(donor => (
            <div key={donor.id} className="bg-white dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar name={donor.name} src={donor.avatar} className="w-10 h-10" textClassName="text-xs" />
                <div className="min-w-0">
                  <p className="font-bold text-sm text-brand-ink dark:text-brand-green-light truncate">{donor.name}</p>
                  <p className="text-xs text-slate-500 font-mono truncate">{donor.email} • {donor.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{donor.bloodGroup}</span>
                <span className="text-xs font-semibold text-slate-500">
                  {f((donor.donationCount ?? 0) === 1 ? s.donationOne : s.donationMany, { count: num(donor.donationCount ?? 0) })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Requests Moderation */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">{s.requestsHeading}</h3>
          {requests.map(req => (
            <div key={req.id} className="bg-white dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl font-mono font-bold flex items-center justify-center shrink-0 text-sm">
                  {req.bloodGroup}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{req.hospitalName} ({req.patientName})</p>
                  <p className="text-xs text-slate-500 truncate">{req.area}, {req.district} • {f(s.neededBy, { deadline: formatRequestDeadline(req.neededByTime, req.createdAt) })}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                  req.urgency === 'Critical' ? 'bg-rose-600 text-white' : 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400'
                }`}>{URGENCY_LABEL[req.urgency] ?? req.urgency}</span>
                <button
                  onClick={() => onDeleteRequest(req.id)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                  title={s.deleteRequest}
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
