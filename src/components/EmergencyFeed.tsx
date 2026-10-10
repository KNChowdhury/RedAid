import { AlertCircle, Clock, MapPin, Share2, ShieldCheck, Users } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { buildRequestShareText, buildWhatsAppShareUrl, formatRequestDeadline } from '../services/lifelineService';
import { EmergencyRequest } from '../types';
import { defineStrings, useStrings } from '../i18n';

const S = defineStrings(
  {
    titleLine1: 'Every Drop',
    titleLine2: 'Saves a Life.',
    subtitle: 'Real-time emergency blood requests across Bangladesh hospitals.',
    postUrgent: 'Post Urgent Request',
    emptyTitle: 'No Active Emergency Requests',
    showMore: 'Show {count} more requests',
    emptyBody: 'All hospital requirements in this area are fulfilled.',
    priorityCritical: 'Critical Priority',
    priorityHigh: 'High Priority',
    priorityMedium: 'Medium Priority',
    priorityOther: '{urgency} Priority',
    needed: 'Needed:',
    patient: 'Patient: {name}.',
    patientWithAge: 'Patient: {name} ({age}y).',
    // Trailing space is deliberate: Bangla puts the verb after the bag count instead.
    requirementFor: 'Requirement for ',
    bags: '{count} Bags',
    ofBlood: ' of {group} blood.',
    compatibleNearby: '{count} Compatible Donors Nearby',
    share: 'Share',
    shareTitle: 'Forward this request on WhatsApp',
    youOffered: '✓ You offered',
    canDonate: 'I can donate',
    canDonateTitle: 'Let the requester know you can donate',
    gotBlood: 'Got blood',
    gotBloodTitle: 'Record who donated',
    edit: 'Edit',
    editTitle: 'Edit your request',
    detailsTitle: 'View Details / Share',
    details: 'Details'
  },
  {
    titleLine1: 'প্রতিটি ফোঁটা',
    titleLine2: 'একটি জীবন বাঁচায়।',
    subtitle: 'সারা বাংলাদেশের হাসপাতাল থেকে সরাসরি জরুরি রক্তের অনুরোধ।',
    postUrgent: 'জরুরি অনুরোধ পোস্ট করুন',
    emptyTitle: 'এখন কোনো জরুরি অনুরোধ নেই',
    showMore: 'আরো {count}টি অনুরোধ দেখুন',
    emptyBody: 'এই এলাকার সব হাসপাতালের চাহিদা পূরণ হয়েছে।',
    priorityCritical: 'অতি জরুরি',
    priorityHigh: 'জরুরি',
    priorityMedium: 'সাধারণ',
    priorityOther: '{urgency}',
    needed: 'কখন লাগবে:',
    patient: 'রোগী: {name}।',
    patientWithAge: 'রোগী: {name} ({age} বছর)।',
    requirementFor: '',
    bags: '{count} ব্যাগ',
    ofBlood: ' {group} রক্ত প্রয়োজন।',
    compatibleNearby: 'কাছাকাছি {count} জন উপযুক্ত দাতা',
    share: 'শেয়ার',
    shareTitle: 'অনুরোধটি WhatsApp-এ ফরোয়ার্ড করুন',
    youOffered: '✓ আপনি জানিয়েছেন',
    canDonate: 'আমি দিতে পারব',
    canDonateTitle: 'অনুরোধকারীকে জানান যে আপনি রক্ত দিতে পারবেন',
    gotBlood: 'রক্ত পেয়েছি',
    gotBloodTitle: 'কে রক্ত দিয়েছেন রেকর্ড করুন',
    edit: 'এডিট',
    editTitle: 'আপনার অনুরোধ এডিট করুন',
    detailsTitle: 'বিস্তারিত দেখুন / শেয়ার',
    details: 'বিস্তারিত'
  }
);

interface EmergencyFeedProps {
  requests: EmergencyRequest[];
  onSelectRequest: (req: EmergencyRequest) => void;
  onRequestBlood: () => void;
  /** Donor id of the signed-in user, so we know which requests they may edit. */
  currentDonorId?: string | null;
  onEditRequest?: (req: EmergencyRequest) => void;
  /** Request ids this donor has already offered to help with. */
  offeredRequestIds?: string[];
  onOfferToDonate?: (req: EmergencyRequest) => void;
  /** Requester marks which donor actually gave blood. */
  onMarkDonated?: (req: EmergencyRequest) => void;
}

export const EmergencyFeed: React.FC<EmergencyFeedProps> = ({
  requests,
  onSelectRequest,
  onRequestBlood,
  currentDonorId = null,
  onEditRequest,
  offeredRequestIds = [],
  onOfferToDonate,
  onMarkDonated
}) => {
  const { s, f } = useStrings(S);
  // A page at a time keeps the phone feed short. Not reset on change: the
  // feed updates live, and collapsing it under someone mid-scroll is worse.
  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // urgency is stored data ('Critical' | 'High' | 'Medium'); only the label is translated.
  const priorityLabel = (urgency: string): string => {
    if (urgency === 'Critical') return s.priorityCritical;
    if (urgency === 'High') return s.priorityHigh;
    if (urgency === 'Medium') return s.priorityMedium;
    return f(s.priorityOther, { urgency });
  };

  return (
    <section className="p-6 lg:p-10 lg:overflow-hidden flex flex-col lg:h-full bg-white dark:bg-slate-900 min-w-0">
      {/* Editorial Title Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 dark:text-slate-100 leading-none mb-3">
            {s.titleLine1}<br />
            <span className="text-rose-600 dark:text-rose-400">{s.titleLine2}</span>
          </h1>
          <p className="text-slate-400 font-bold max-w-lg uppercase text-[11px] tracking-widest">
            {s.subtitle}
          </p>
        </div>

        <button
          onClick={onRequestBlood}
          className="sm:hidden py-3 px-6 blood-gradient text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md flex items-center justify-center gap-2"
        >
          <AlertCircle className="w-4 h-4 animate-bounce" />
          {s.postUrgent}
        </button>
      </header>

      {/* Requests List Feed */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scroll pb-12">
        {requests.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{s.emptyTitle}</h3>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">{s.emptyBody}</p>
          </div>
        ) : (
          requests.slice(0, visibleCount).map((req, idx) => {
            const isCritical = req.urgency === 'Critical';
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(idx, 10) * 0.03, ease: 'easeOut' }}
                className={`group bg-white dark:bg-slate-800/60 p-6 sm:p-7 rounded-[2.2rem] border transition-all relative overflow-hidden ${
                  req.status === 'Fulfilled'
                    ? 'border-slate-100 dark:border-slate-800 opacity-60 grayscale-[0.4]'
                    : isCritical
                    ? 'border-rose-200/80 dark:border-rose-900/50 shadow-md shadow-rose-500/5 hover:shadow-xl hover:border-rose-300 dark:hover:border-rose-700'
                    : 'border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-lg'
                }`}
              >
                {/* Blood Group Watermark Badge */}
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full flex items-center justify-center pl-6 pb-6 ${
                  isCritical ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  <span className="font-black text-2xl font-mono">{req.bloodGroup}</span>
                </div>

                <div className="flex items-start gap-4 mb-4 pr-20">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                    isCritical ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    <AlertCircle className="w-6 h-6" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-slate-100 break-words">{req.hospitalName}</h3>
                      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${
                        isCritical ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400'
                      }`}>
                        {priorityLabel(req.urgency)}
                      </span>
                    </div>

                    <p className="text-slate-400 text-xs uppercase font-bold tracking-wider flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        {req.area}, {req.district}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {s.needed} <span className="text-rose-600 dark:text-rose-400 font-extrabold">{formatRequestDeadline(req.neededByTime, req.createdAt)}</span>
                      </span>
                    </p>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 mb-6 font-semibold leading-relaxed">
                  <span className="text-brand-ink dark:text-brand-green-light font-bold">{req.age ? f(s.patientWithAge, { name: req.patientName ?? '', age: req.age }) : f(s.patient, { name: req.patientName ?? '' })}</span> {s.requirementFor}<span className="text-rose-600 dark:text-rose-400 font-black underline decoration-rose-300 decoration-2">{f(s.bags, { count: req.requiredBags ?? '' })}</span>{f(s.ofBlood, { group: req.bloodGroup ?? '' })} {req.reason}
                </p>

                {/* Footer Meta & Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-900/50">
                      <Users className="w-3.5 h-3.5" />
                      {f(s.compatibleNearby, { count: req.matchedDonorsCount ?? '' })}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 w-full sm:flex-row sm:flex-wrap sm:items-center sm:w-auto">
                    {/* Primary actions get an even 2-up row on mobile instead of
                        wrapping ad hoc with the secondary chips below — that mix
                        of one full-width button and several small pills was the
                        "hijibiji" look on narrow screens. sm:contents drops this
                        wrapper from layout at sm+, rejoining the single row. */}
                    <div className="grid grid-cols-2 gap-2.5 sm:contents">
                      {/* Anyone can forward a request to their own groups. This is
                          how blood actually gets found here, so it stays available
                          to guests and signed-in users alike. */}
                      <a
                        href={buildWhatsAppShareUrl(buildRequestShareText(req))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 bg-[#25D366] hover:bg-[#1da851] text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors text-center"
                        title={s.shareTitle}
                      >
                        {s.share}
                      </a>

                      {/* Donor side: offer to help. Hidden on your own request. */}
                      {onOfferToDonate && currentDonorId && req.requesterId !== currentDonorId && req.status !== 'Fulfilled' && (
                        offeredRequestIds.includes(req.id) ? (
                          <span className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-[11px] font-black uppercase tracking-wider text-center flex items-center justify-center">
                            {s.youOffered}
                          </span>
                        ) : (
                          <button
                            onClick={() => onOfferToDonate(req)}
                            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors"
                            title={s.canDonateTitle}
                          >
                            {s.canDonate}
                          </button>
                        )
                      )}

                      {/* Requester side: close the loop once blood was received. */}
                      {onMarkDonated && currentDonorId && req.requesterId === currentDonorId && req.status !== 'Fulfilled' && (
                        <button
                          onClick={() => onMarkDonated(req)}
                          className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors"
                          title={s.gotBloodTitle}
                        >
                          {s.gotBlood}
                        </button>
                      )}

                      {onEditRequest && currentDonorId && req.requesterId === currentDonorId && (
                        <button
                          onClick={() => onEditRequest(req)}
                          className="px-4 py-3 bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors"
                          title={s.editTitle}
                        >
                          {s.edit}
                        </button>
                      )}

                      <button
                        onClick={() => onSelectRequest(req)}
                        className="px-4 py-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                        title={s.detailsTitle}
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="sm:hidden">{s.details}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        {requests.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="mt-6 w-full sm:w-auto sm:mx-auto sm:flex sm:px-10 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-rose-300 hover:text-rose-600 transition-colors"
          >
            {f(s.showMore, { count: Math.min(PAGE_SIZE, requests.length - visibleCount) })}
          </button>
        )}
      </div>
    </section>
  );
};
