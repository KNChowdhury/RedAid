import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  buildRequestShareText,
  buildWhatsAppShareUrl,
  confirmMyDonation,
  closeRequestManaged,
  closeRequestWithDonor,
  fetchRequestResponders,
  getCompatibleDonorGroups,
  PendingConfirmation
} from '../services/lifelineService';
import { DonorProfile, EmergencyRequest } from '../types';
import { backdropClose, useDismissable } from '../hooks/useDismissable';
import { defineStrings, useStrings } from '../i18n';
import { nameMatches } from '../nameMatch';

const toAsciiDigits = (value: string) => value.replace(/[০-৯]/g, ch => String(ch.charCodeAt(0) - 0x09e6));

const S = defineStrings(
  {
    // MarkDonatedModal
    chooseDonor: 'Please choose who donated.',
    couldNotRecord: 'Could not record this donation.',
    whoDonated: 'Who donated?',
    forRequest: 'For {patient} • {group} • {hospital}',
    closeDonationDialog: 'Close donation dialog',
    confirmExplainer:
      'The donor will get a notification to confirm. Their points are awarded only after they agree, so nobody can be credited by mistake.',
    loading: 'Loading…',
    offeredToHelp: 'Offered to help',
    orSearchAny: 'Or search any donor',
    searchForDonor: 'Search for the donor',
    searchPlaceholder: 'Name or phone number',
    noDonorMatched: 'No donor matched that search.',
    phoneSearchHint: 'Phone numbers are private, so they are not shown in the list. Press "Record donation" and we will find the donor by this number.',
    incompatibleMatched: '{count} donor(s) matched, but their blood group cannot be given to a {group} patient.',
    bagsDonated: 'Bags donated',
    recording: 'Recording…',
    recordDonation: 'Record donation',
    orTypePhone: "Or type the donor's phone number",
    phonePlaceholder: '01XXXXXXXXX',
    managedElsewhere: 'Got blood from somewhere else',
    managedExplainer: 'Closes the request as "Managed". A request cannot be deleted.',
    closing: 'Closing…',
    errDonorNotFound: 'No RedAid donor has this phone number. Check it, or choose "Got blood from somewhere else".',
    errPhoneAmbiguous: 'More than one donor has this number. Please pick the donor from the list.',
    errInvalidPhone: 'Enter a valid 11-digit phone number.',
    errAlreadyClosed: 'This request is already closed.',
    errBloodMismatch: "This donor's blood group can't be given to this patient. Please check you picked the right person.",
    // ConfirmDonationBanner
    couldNotConfirm: 'Could not confirm right now.',
    didYouDonate: 'Did you donate for {patient}?',
    bagOne: '{count} bag',
    bagMany: '{count} bags',
    confirmReward: 'Confirm to receive {points} RedAid points and update your donation record.',
    yesIDonated: 'Yes, I donated',
    // ShareRequestModal
    requestPosted: 'Request posted ✓',
    spreadIt: 'Now spread it — this is what finds blood fastest',
    closeShareDialog: 'Close share dialog',
    shareExplainer:
      'Matching donors on RedAid have already been notified. Forwarding this to your own WhatsApp groups reaches many more people.',
    shareOnWhatsApp: 'Share on WhatsApp',
    copied: 'Copied ✓',
    copyText: 'Copy text',
    skipForNow: 'Skip for now'
  },
  {
    chooseDonor: 'কে রক্ত দিয়েছেন, বেছে নিন।',
    couldNotRecord: 'রক্তদানটি রেকর্ড করা যায়নি।',
    whoDonated: 'কে রক্ত দিয়েছেন?',
    forRequest: 'রোগী: {patient} • {group} • {hospital}',
    closeDonationDialog: 'রক্তদানের ডায়ালগ বন্ধ করুন',
    confirmExplainer:
      'রক্তদাতা নিশ্চিত করার জন্য একটি নোটিফিকেশন পাবেন। তিনি সম্মতি দিলে তবেই পয়েন্ট যোগ হবে, তাই ভুল করে কারও নামে পয়েন্ট যাবে না।',
    loading: 'লোড হচ্ছে…',
    offeredToHelp: 'যাঁরা দিতে চেয়েছেন',
    orSearchAny: 'অথবা যেকোনো রক্তদাতা খুঁজুন',
    searchForDonor: 'রক্তদাতাকে খুঁজুন',
    searchPlaceholder: 'নাম বা ফোন নম্বর',
    noDonorMatched: 'কোনো রক্তদাতা পাওয়া যায়নি।',
    phoneSearchHint: 'নম্বর গোপন রাখা হয়, তাই লিস্টে দেখায় না। "রক্তদান রেকর্ড করুন" চাপুন, এই নম্বর দিয়ে রক্তদাতাকে খুঁজে নেওয়া হবে।',
    incompatibleMatched: '{count} জন মিলেছে, কিন্তু তাঁদের রক্তের গ্রুপ {group} রোগীকে দেওয়া যায় না।',
    bagsDonated: 'কত ব্যাগ দিয়েছেন',
    recording: 'রেকর্ড হচ্ছে…',
    recordDonation: 'রক্তদান রেকর্ড করুন',
    orTypePhone: 'অথবা রক্তদাতার ফোন নম্বর লিখুন',
    phonePlaceholder: '01XXXXXXXXX',
    managedElsewhere: 'অন্য জায়গা থেকে রক্ত পেয়েছি',
    managedExplainer: 'অনুরোধটি "Managed" হিসেবে বন্ধ হবে। অনুরোধ মুছে ফেলা যায় না।',
    closing: 'বন্ধ হচ্ছে…',
    errDonorNotFound: 'এই নম্বরে কোনো RedAid রক্তদাতা নেই। নম্বরটি দেখুন, অথবা "অন্য জায়গা থেকে রক্ত পেয়েছি" বেছে নিন।',
    errPhoneAmbiguous: 'এই নম্বরে একাধিক রক্তদাতা আছেন। তালিকা থেকে রক্তদাতাকে বেছে নিন।',
    errInvalidPhone: 'সঠিক ১১ সংখ্যার ফোন নম্বর লিখুন।',
    errAlreadyClosed: 'এই অনুরোধটি আগেই বন্ধ হয়ে গেছে।',
    errBloodMismatch: 'এই দাতার রক্তের গ্রুপ এই রোগীকে দেওয়া যায় না। সঠিক মানুষকে বেছেছেন কিনা দেখুন।',
    couldNotConfirm: 'এখন নিশ্চিত করা যায়নি।',
    didYouDonate: 'আপনি কি {patient}-এর জন্য রক্ত দিয়েছেন?',
    bagOne: '{count} ব্যাগ',
    bagMany: '{count} ব্যাগ',
    confirmReward: 'নিশ্চিত করলে {points} RedAid পয়েন্ট পাবেন এবং আপনার রক্তদানের রেকর্ড আপডেট হবে।',
    yesIDonated: 'হ্যাঁ, দিয়েছি',
    requestPosted: 'অনুরোধ পোস্ট হয়েছে ✓',
    spreadIt: 'এখন শেয়ার করুন — এভাবেই সবচেয়ে দ্রুত রক্ত মেলে',
    closeShareDialog: 'শেয়ার ডায়ালগ বন্ধ করুন',
    shareExplainer:
      'RedAid-এ মিলে যাওয়া রক্তদাতাদের ইতিমধ্যে জানানো হয়েছে। আপনার নিজের WhatsApp গ্রুপে ফরোয়ার্ড করলে আরও অনেক মানুষের কাছে পৌঁছাবে।',
    shareOnWhatsApp: 'WhatsApp-এ শেয়ার করুন',
    copied: 'কপি হয়েছে ✓',
    copyText: 'লেখাটি কপি করুন',
    skipForNow: 'এখন না'
  }
);

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
  const [phone, setPhone] = useState('');
  const { s, f } = useStrings(S);

  useDismissable(isOpen && !!request, onClose);

  useEffect(() => {
    if (!isOpen || !request) return;
    let cancelled = false;
    setError('');
    setSelectedId('');
    setSearch('');
    setPhone('');
    setUnits(String(request.requiredBags || 1));
    setLoading(true);

    (async () => {
      const list = await fetchRequestResponders(request.id);
      if (cancelled) return;
      setResponders(list);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [isOpen, request?.id]);

  if (!isOpen || !request) return null;

  // Most real donations happen after a phone call, so the requester also needs
  // to be able to pick any donor, not just the ones who tapped the app button.
  // Only donors whose group can be given to this patient (patch_34 enforces
  // the same rule server-side; this just keeps wrong picks out of the list).
  const compatible = new Set<string>(getCompatibleDonorGroups(request.bloodGroup));
  const compatibleResponders = responders.filter(r => compatible.has(r.bloodGroup));
  const offeredIds = new Set(responders.map(r => r.donorId));
  // The public donor list has no phone numbers (privacy), so a number typed
  // here can't match in the list -- it is sent to the server lookup instead,
  // same as the phone box below. Bangla digits are converted first.
  const searchText = toAsciiDigits(search).trim().replace(/\s+/g, ' ').toLowerCase();
  const searchIsPhone = /^[+\d][\d\s-]{5,}$/.test(searchText);
  const nameTokens = searchIsPhone ? [] : searchText.split(' ').filter(Boolean);
  const nameMatches = nameTokens.length
    ? allDonors.filter(d => {
        return d.id !== request.requesterId && nameMatches(d.name || '', searchText);
      })
    : [];
  const others = (nameTokens.length ? nameMatches : allDonors.filter(d => d.id !== request.requesterId))
    .filter(d => !offeredIds.has(d.id) && compatible.has(d.bloodGroup))
    .slice(0, 20);
  // Matches hidden only because the blood group can't be given to this patient.
  const incompatibleMatches = nameMatches.filter(d => !compatible.has(d.bloodGroup)).length;

  const closeErrorText = (err: string | null) => {
    if (!err) return s.couldNotRecord;
    if (err.includes('DONOR_NOT_FOUND')) return s.errDonorNotFound;
    if (err.includes('DONOR_PHONE_AMBIGUOUS')) return s.errPhoneAmbiguous;
    if (err.includes('INVALID_PHONE')) return s.errInvalidPhone;
    if (err.includes('REQUEST_ALREADY_CLOSED')) return s.errAlreadyClosed;
    if (err.includes('BLOOD_GROUP_MISMATCH')) return s.errBloodMismatch;
    return err;
  };

  const handleSave = async () => {
    const typedPhone = toAsciiDigits(phone).trim() || (!selectedId && searchIsPhone ? searchText : '');
    if (!selectedId && !typedPhone) {
      setError(s.chooseDonor);
      return;
    }
    setSaving(true);
    setError('');
    const { ok, error: err } = await closeRequestWithDonor(
      request.id,
      typedPhone ? { phone: typedPhone } : { donorId: selectedId },
      parseInt(units, 10) || 1
    );
    setSaving(false);

    if (!ok) {
      setError(closeErrorText(err));
      return;
    }
    onRecorded();
    onClose();
  };

  const handleManaged = async () => {
    setSaving(true);
    setError('');
    const { ok, error: err } = await closeRequestManaged(request.id);
    setSaving(false);

    if (!ok) {
      setError(closeErrorText(err));
      return;
    }
    onRecorded();
    onClose();
  };

  const DonorRow = ({ id, name, group }: { id: string; name: string; group: string }) => (
    <label
      key={id}
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
        selectedId === id ? 'border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
      }`}
    >
      <input
        type="radio"
        name="donor"
        checked={selectedId === id}
        onChange={() => { setSelectedId(id); setPhone(''); }}
        className="accent-rose-600"
      />
      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex-1">{name}</span>
      {group && <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">{group}</span>}
    </label>
  );

  return (
    <div
      onClick={backdropClose(onClose)}
      className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scroll">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="editorial-title text-2xl font-black text-slate-900 dark:text-slate-100">{s.whoDonated}</h2>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              {f(s.forRequest, { patient: request.patientName ?? '', group: request.bloodGroup ?? '', hospital: request.hospitalName ?? '' })}
            </p>
          </div>
          <button onClick={onClose} aria-label={s.closeDonationDialog} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          {s.confirmExplainer}
        </p>

        {loading ? (
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500 py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> {s.loading}
          </p>
        ) : (
          <div className="space-y-4">
            {compatibleResponders.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
                  {s.offeredToHelp}
                </p>
                <div className="space-y-2">
                  {compatibleResponders.map(r => (
                    <DonorRow key={r.donorId} id={r.donorId} name={r.donorName} group={r.bloodGroup} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                {compatibleResponders.length ? s.orSearchAny : s.searchForDonor}
              </p>
              <input
                id="donation-search"
                name="donorSearch"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={s.searchPlaceholder}
                className="w-full px-4 py-3 mb-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold"
              />
              <div className="space-y-2">
                {others.map(d => (
                  <DonorRow key={d.id} id={d.id} name={d.name} group={d.bloodGroup} />
                ))}
                {searchIsPhone && (
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">{s.phoneSearchHint}</p>
                )}
                {!searchIsPhone && others.length === 0 && search && (
                  <p className="text-xs text-slate-400 py-2">
                    {incompatibleMatches ? f(s.incompatibleMatched, { count: incompatibleMatches, group: request.bloodGroup ?? '' }) : s.noDonorMatched}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="donation-phone" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{s.orTypePhone}</label>
              <input
                id="donation-phone"
                name="donorPhone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); if (e.target.value) setSelectedId(''); }}
                placeholder={s.phonePlaceholder}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold"
              />
            </div>

            <div>
              <label htmlFor="donation-units" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.bagsDonated}</label>
              <input
                id="donation-units"
                name="units"
                type="number"
                min="1"
                value={units}
                onChange={e => setUnits(e.target.value)}
                className="w-28 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400">
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
          {saving ? s.recording : s.recordDonation}
        </button>

        <button
          onClick={handleManaged}
          disabled={saving || loading}
          className="mt-3 w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-60 text-slate-700 dark:text-slate-200 rounded-xl font-black uppercase text-xs tracking-widest transition-colors"
        >
          {saving ? s.closing : s.managedElsewhere}
        </button>
        <p className="mt-2 text-[11px] text-slate-400 text-center">{s.managedExplainer}</p>
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
  const { s, f } = useStrings(S);

  if (pending.length === 0) return null;

  const handleConfirm = async (donationId: string) => {
    setBusyId(donationId);
    setError('');
    const { ok, error: err } = await confirmMyDonation(donationId);
    setBusyId(null);

    if (!ok) {
      setError(err?.includes('BLOOD_GROUP_MISMATCH') ? s.errBloodMismatch : (err || s.couldNotConfirm));
      return;
    }
    onConfirmed();
  };

  return (
    <div className="mb-6 space-y-3">
      {pending.map(p => (
        <div
          key={p.donationId}
          className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <p className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300">{f(s.didYouDonate, { patient: p.patientName ?? '' })}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              {p.bloodGroup} • {f(p.units === 1 ? s.bagOne : s.bagMany, { count: p.units ?? '' })}
              {p.hospitalName ? ` • ${p.hospitalName}` : ''}
              {p.donatedAt ? ` • ${p.donatedAt}` : ''}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              {f(s.confirmReward, { points: 150 })}
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
            {s.yesIDonated}
          </button>
        </div>
      ))}

      {error && (
        <p className="text-xs font-bold text-rose-700 dark:text-rose-400 px-1">{error}</p>
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
  const copiedResetTimer = React.useRef<number | null>(null);
  const { s } = useStrings(S);

  useDismissable(isOpen && !!request, onClose);

  useEffect(() => () => {
    if (copiedResetTimer.current !== null) {
      window.clearTimeout(copiedResetTimer.current);
    }
  }, []);

  if (!isOpen || !request) return null;

  const text = buildRequestShareText(request);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copiedResetTimer.current !== null) {
        window.clearTimeout(copiedResetTimer.current);
      }
      copiedResetTimer.current = window.setTimeout(() => {
        copiedResetTimer.current = null;
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      onClick={backdropClose(onClose)}
      className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scroll">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="editorial-title text-2xl font-black text-slate-900 dark:text-slate-100">{s.requestPosted}</h2>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              {s.spreadIt}
            </p>
          </div>
          <button onClick={onClose} aria-label={s.closeShareDialog} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          {s.shareExplainer}
        </p>

        <pre className="text-[11px] whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-700 dark:text-slate-300 font-sans mb-4">
{text}
        </pre>

        <a
          href={buildWhatsAppShareUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 bg-[#25D366] hover:bg-[#1da851] text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          {s.shareOnWhatsApp}
        </a>

        <button
          onClick={handleCopy}
          className="mt-2 w-full py-3 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black uppercase text-xs tracking-widest transition-colors"
        >
          {copied ? s.copied : s.copyText}
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-400"
        >
          {s.skipForNow}
        </button>
      </div>
    </div>
  );
};
