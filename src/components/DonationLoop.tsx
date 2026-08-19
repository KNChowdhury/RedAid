import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  buildRequestShareText,
  buildWhatsAppShareUrl,
  confirmMyDonation,
  fetchRequestResponders,
  recordDonation,
  PendingConfirmation
} from '../services/lifelineService';
import { DonorProfile, EmergencyRequest } from '../types';
import { backdropClose, useDismissable } from '../hooks/useDismissable';

type Responder = { donorId: string; donorName: string; bloodGroup: string };

/* ============================================================
 * 1. "Got blood" — the requester records who actually donated
 * ============================================================ */

interface MarkDonatedModalProps {
  request: EmergencyRequest | null;
  isOpen: boolean;
  /** Fallback list when nobody used the in-app offer button. */
  allDonors: DonorProfile[];
  onClose: () => void;
  onRecorded: () => void;
}

export const MarkDonatedModal: React.FC<MarkDonatedModalProps> = ({
  request,
  isOpen,
  allDonors,
  onClose,
  onRecorded
}) => {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [units, setUnits] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useDismissable(isOpen && !!request, onClose);

  useEffect(() => {
    if (!isOpen || !request) return;
    setError('');
    setSelectedId('');
    setSearch('');
    setUnits(String(request.requiredBags || 1));
    setLoading(true);

    (async () => {
      const list = await fetchRequestResponders(request.id);
      setResponders(list);
      setLoading(false);
    })();
  }, [isOpen, request?.id]);

  if (!isOpen || !request) return null;

  // Most real donations happen after a phone call, so the requester also needs
  // to be able to pick any donor, not just the ones who tapped the app button.
  const offeredIds = new Set(responders.map(r => r.donorId));
  const others = allDonors
    .filter(d => !offeredIds.has(d.id) && d.id !== request.requesterId)
    .filter(d =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.phone || '').includes(search)
    )
    .slice(0, 8);

  const handleSave = async () => {
    if (!selectedId) {
      setError('Please choose who donated.');
      return;
    }
    setSaving(true);
    setError('');
    const { ok, error: err } = await recordDonation(request.id, selectedId, parseInt(units, 10) || 1);
    setSaving(false);

    if (!ok) {
      setError(err || 'Could not record this donation.');
      return;
    }
    onRecorded();
    onClose();
  };

  const DonorRow = ({ id, name, group }: { id: string; name: string; group: string }) => (
    <label
      key={id}
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
        selectedId === id ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <input
        type="radio"
        name="donor"
        checked={selectedId === id}
        onChange={() => setSelectedId(id)}
        className="accent-rose-600"
      />
      <span className="text-sm font-bold text-slate-800 flex-1">{name}</span>
      {group && <span className="font-mono font-black text-rose-600 text-sm">{group}</span>}
    </label>
  );

  return (
    <div
      onClick={backdropClose(onClose)}
      className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scroll">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="editorial-title text-2xl font-black text-slate-900">Who donated?</h2>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              For {request.patientName} • {request.bloodGroup} • {request.hospitalName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          The donor will get a notification to confirm. Their points are awarded only after they
          agree, so nobody can be credited by mistake.
        </p>

        {loading ? (
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500 py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : (
          <div className="space-y-4">
            {responders.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">
                  Offered to help
                </p>
                <div className="space-y-2">
                  {responders.map(r => (
                    <DonorRow key={r.donorId} id={r.donorId} name={r.donorName} group={r.bloodGroup} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                {responders.length ? 'Or search any donor' : 'Search for the donor'}
              </p>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name or phone number"
                className="w-full px-4 py-3 mb-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
              <div className="space-y-2">
                {others.map(d => (
                  <DonorRow key={d.id} id={d.id} name={d.name} group={d.bloodGroup} />
                ))}
                {others.length === 0 && search && (
                  <p className="text-xs text-slate-400 py-2">No donor matched that search.</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Bags donated</label>
              <input
                type="number"
                min="1"
                value={units}
                onChange={e => setUnits(e.target.value)}
                className="w-28 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="mt-6 w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {saving ? 'Recording…' : 'Record donation'}
        </button>
      </div>
    </div>
  );
};

/* ============================================================
 * 2. Donor confirms a donation the requester logged
 * ============================================================ */

interface ConfirmDonationBannerProps {
  pending: PendingConfirmation[];
  onConfirmed: () => void;
}

export const ConfirmDonationBanner: React.FC<ConfirmDonationBannerProps> = ({
  pending,
  onConfirmed
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (pending.length === 0) return null;

  const handleConfirm = async (donationId: string) => {
    setBusyId(donationId);
    setError('');
    const { ok, error: err } = await confirmMyDonation(donationId);
    setBusyId(null);

    if (!ok) {
      setError(err || 'Could not confirm right now.');
      return;
    }
    onConfirmed();
  };

  return (
    <div className="mb-6 space-y-3">
      {pending.map(p => (
        <div
          key={p.donationId}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <p className="text-sm font-extrabold text-emerald-900">Did you donate for {p.patientName}?</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {p.bloodGroup} • {p.units} bag{p.units === 1 ? '' : 's'}
              {p.hospitalName ? ` • ${p.hospitalName}` : ''}
              {p.donatedAt ? ` • ${p.donatedAt}` : ''}
            </p>
            <p className="text-[11px] text-emerald-600 mt-1">
              Confirm to receive 150 Lifeline points and update your donation record.
            </p>
          </div>

          <button
            onClick={() => handleConfirm(p.donationId)}
            disabled={busyId === p.donationId}
            className="shrink-0 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            {busyId === p.donationId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Yes, I donated
          </button>
        </div>
      ))}

      {error && (
        <p className="text-xs font-bold text-rose-700 px-1">{error}</p>
      )}
    </div>
  );
};


/* ============================================================
 * 3. Share prompt shown right after a request is posted
 * ============================================================ */

interface ShareRequestModalProps {
  request: EmergencyRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareRequestModal: React.FC<ShareRequestModalProps> = ({
  request,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  useDismissable(isOpen && !!request, onClose);

  if (!isOpen || !request) return null;

  const text = buildRequestShareText(request);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      onClick={backdropClose(onClose)}
      className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scroll">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="editorial-title text-2xl font-black text-slate-900">Request posted ✓</h2>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              Now spread it — this is what finds blood fastest
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Matching donors on LifelineBD have already been notified. Forwarding this to your own
          WhatsApp groups reaches many more people.
        </p>

        <pre className="text-[11px] whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-700 font-sans mb-4">
{text}
        </pre>

        <a
          href={buildWhatsAppShareUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 bg-[#25D366] hover:bg-[#1da851] text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          Share on WhatsApp
        </a>

        <button
          onClick={handleCopy}
          className="mt-2 w-full py-3 border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-black uppercase text-xs tracking-widest transition-colors"
        >
          {copied ? 'Copied ✓' : 'Copy text'}
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full text-xs font-bold text-slate-400 hover:text-slate-600"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};
