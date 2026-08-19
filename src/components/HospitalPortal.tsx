import { AlertCircle, Building2, FileCheck, Loader2, Plus, ShieldCheck, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { fetchHospitalStats, fetchRequestResponders, verifyDonation, HospitalStats } from '../services/lifelineService';
import { DonorProfile, EmergencyRequest } from '../types';

interface HospitalPortalProps {
  requests: EmergencyRequest[];
  onRequestBlood: () => void;
  currentUser: DonorProfile | null;
  onDataChanged?: () => void;
}

type Responder = { donorId: string; donorName: string; bloodGroup: string };

export const HospitalPortal: React.FC<HospitalPortalProps> = ({
  requests,
  onRequestBlood,
  currentUser,
  onDataChanged
}) => {
  const [hospitals, setHospitals] = useState<HospitalStats[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [responders, setResponders] = useState<Record<string, Responder[]>>({});
  const [verifying, setVerifying] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  // Only hospital accounts and admins may verify donations. Everyone else sees
  // the portal read-only, so the buttons don't promise something they can't do.
  const canVerify = currentUser?.role === 'hospital' || currentUser?.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchHospitalStats();
      if (cancelled) return;
      setHospitals(rows);
      setSelectedId(prev => prev || rows[0]?.hospitalId || '');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const selected = hospitals.find(h => h.hospitalId === selectedId) || null;

  // Match requests to the selected hospital by name, case-insensitively.
  const hospitalRequests = selected
    ? requests.filter(r => (r.hospitalName || '').toLowerCase() === selected.hospitalName.toLowerCase())
    : [];

  // Load who actually responded, instead of showing an invented count.
  useEffect(() => {
    hospitalRequests.forEach(async req => {
      if (responders[req.id]) return;
      const list = await fetchRequestResponders(req.id);
      setResponders(prev => ({ ...prev, [req.id]: list }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalRequests.map(r => r.id).join(',')]);

  const handleVerify = async (requestId: string, donorId: string) => {
    setActionError('');
    setVerifying(requestId + donorId);
    const { ok, error } = await verifyDonation(requestId, donorId);
    setVerifying(null);

    if (!ok) {
      setActionError(error || 'Could not verify this donation.');
      return;
    }

    const refreshed = await fetchHospitalStats();
    setHospitals(refreshed);
    onDataChanged?.();
  };

  if (loading) {
    return (
      <section className="p-6 lg:p-10 h-full bg-white flex items-center justify-center">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading hospitals…
        </p>
      </section>
    );
  }

  if (hospitals.length === 0) {
    return (
      <section className="p-6 lg:p-10 h-full bg-white flex items-center justify-center">
        <div className="max-w-md text-center">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-extrabold text-slate-800">No hospitals registered yet</h2>
          <p className="text-sm text-slate-500 mt-1">
            Once hospitals are added to the database they'll appear here with their live requisitions.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="p-6 lg:p-10 overflow-y-auto custom-scroll h-full bg-white space-y-10 pb-20">
      <header className="border-b border-slate-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Hospital Portal
            </span>
            {!canVerify && (
              <span className="text-xs font-bold text-slate-400">• View only</span>
            )}
          </div>
          <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 leading-tight">
            Hospital Emergency <span className="text-rose-600">Operations.</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
          <Building2 className="w-5 h-5 text-rose-600 ml-2" />
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="bg-transparent font-extrabold text-sm text-slate-800 outline-hidden pr-4 py-1 cursor-pointer max-w-[16rem]"
          >
            {hospitals.map(h => (
              <option key={h.hospitalId} value={h.hospitalId}>{h.hospitalName}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Live stats — every figure counted from the database */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-lg">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Active Blood Requisitions</p>
          <p className="text-4xl font-mono font-black text-white">{selected?.activeRequests ?? 0}</p>
          <p className="text-xs text-rose-400 font-bold mt-2">
            {selected?.criticalRequests
              ? `🚨 ${selected.criticalRequests} critical`
              : 'No critical cases right now'}
          </p>
        </div>

        <div className="bg-rose-50 p-6 rounded-3xl border border-rose-200/80">
          <p className="text-[10px] uppercase font-extrabold text-rose-800 tracking-wider mb-1">Verified Transfusions (This Month)</p>
          <p className="text-4xl font-mono font-black text-rose-600">{selected?.unitsThisMonth ?? 0} Units</p>
          <p className="text-xs text-slate-500 font-bold mt-2">
            {selected?.bagsNeeded ? `${selected.bagsNeeded} bags still needed` : 'All requisitions met'}
          </p>
        </div>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider mb-1">
              On-Call Donors in {selected?.district || 'district'}
            </p>
            <p className="text-4xl font-mono font-black text-slate-900">{selected?.onCallDonors ?? 0}</p>
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

      {actionError && (
        <div className="flex items-start gap-2 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {actionError}
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Requisitions & Screening Roster</h2>
          {selected?.area && <span className="text-xs font-bold text-slate-600">{selected.area}</span>}
        </div>

        {hospitalRequests.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
            <p className="text-sm font-bold text-slate-600">No open requisitions for this hospital</p>
            <p className="text-xs text-slate-400 mt-1">
              Requests posted with this hospital's name will show up here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {hospitalRequests.map(req => {
              const checkedIn = responders[req.id] || [];
              return (
                <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-start gap-4 pr-4">
                      <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl font-mono font-black text-2xl flex items-center justify-center shrink-0">
                        {req.bloodGroup}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-lg text-slate-900">Patient: {req.patientName}</h3>
                          <span className="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded font-bold uppercase">{req.urgency}</span>
                          {req.status === 'Fulfilled' && (
                            <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold uppercase">Fulfilled</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          Requirement: <strong className="text-slate-800">{req.requiredBags} Bags</strong>
                          {req.neededByTime ? ` • Needed by ${req.neededByTime}` : ''}
                        </p>
                        {req.reason && <p className="text-xs text-slate-400 italic mt-0.5">"{req.reason}"</p>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                        <Users className="w-3.5 h-3.5" />
                        {checkedIn.length} donor{checkedIn.length === 1 ? '' : 's'} checked in
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {checkedIn.length ? 'Ready for cross-match screening' : 'Awaiting donor responses'}
                      </p>
                    </div>
                  </div>

                  {/* One verify button per donor who actually responded. */}
                  {checkedIn.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-slate-100 space-y-2">
                      {checkedIn.map(d => (
                        <div key={d.donorId} className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-700">
                            {d.donorName}
                            {d.bloodGroup && <span className="ml-2 font-mono text-rose-600">{d.bloodGroup}</span>}
                          </span>

                          {canVerify ? (
                            <button
                              onClick={() => handleVerify(req.id, d.donorId)}
                              disabled={verifying === req.id + d.donorId || req.status === 'Fulfilled'}
                              className="px-4 py-2 bg-slate-900 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              {verifying === req.id + d.donorId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <FileCheck className="w-3.5 h-3.5" />
                              )}
                              Verify Donation
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Hospital staff only</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
};
