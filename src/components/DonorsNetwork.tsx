import { Calendar, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { calculateAge, getDonorContact, getWhatsAppUrl, isDonorAvailableNow } from '../services/lifelineService';
import { DonorProfile } from '../types';
import { defineStrings, formatDate, useStrings } from '../i18n';

const S = defineStrings(
  {
    title: 'Donors',
    loading: 'Loading donors…',
    loadFailed: 'Could not load donors',
    noneMatch: 'No donors match these filters',
    matchOne: '{count} donor match your filters',
    matchMany: '{count} donors match your filters',
    loadFailedHelp: "Check your internet connection. We'll keep trying automatically.",
    tryAgain: 'Try again',
    emptyTitle: 'No Donors Match Your Current Filters',
    emptyHelp: 'Try widening your distance radius, removing specific health constraints, or posting an emergency request to broadcast across all districts.',
    broadcast: '🚨 Broadcast Emergency Request',
    ageShort: '{age}y',
    locationNotSet: 'Location not set',
    availableNow: 'Available now',
    notAvailable: 'Not available',
    donatedTimes: ' · donated {count}×',
    firstTime: ' · first-time donor',
    lastDonated: 'Last donated',
    availableFrom: 'Available from',
    screeningComplete: 'Screening complete · self-reported',
    whatsappMessage: 'Hello, I found your number on Roktobondhu Bangladesh. Can you help?',
    whatsappLabel: 'Message {name} on WhatsApp',
    notAvailableNow: 'Not available right now',
    checking: 'Checking...',
    showNumber: 'Show number',
    profile: 'Profile'
  },
  {
    title: 'রক্তদাতা',
    loading: 'রক্তদাতাদের তালিকা লোড হচ্ছে…',
    loadFailed: 'রক্তদাতাদের তালিকা লোড করা যায়নি',
    noneMatch: 'এই ফিল্টারে কোনো রক্তদাতা মেলেনি',
    matchOne: '{count} জন রক্তদাতা মিলেছে',
    matchMany: '{count} জন রক্তদাতা মিলেছে',
    loadFailedHelp: 'ইন্টারনেট সংযোগ দেখুন। আমরা নিজে থেকেই আবার চেষ্টা করছি।',
    tryAgain: 'আবার চেষ্টা করুন',
    emptyTitle: 'এই ফিল্টারে কোনো রক্তদাতা মেলেনি',
    emptyHelp: 'ফিল্টার একটু কমিয়ে দেখুন, অথবা একটি জরুরি অনুরোধ পোস্ট করুন যাতে সব জেলার মানুষ দেখতে পান।',
    broadcast: '🚨 জরুরি অনুরোধ পোস্ট করুন',
    ageShort: '{age} বছর',
    locationNotSet: 'এলাকা দেওয়া নেই',
    availableNow: 'এখন দিতে পারবেন',
    notAvailable: 'এখন দিতে পারবেন না',
    donatedTimes: ' · {count} বার রক্ত দিয়েছেন',
    firstTime: ' · প্রথমবার দাতা',
    lastDonated: 'শেষ রক্তদান',
    availableFrom: 'দিতে পারবেন',
    screeningComplete: 'দাতার দেওয়া তথ্য অনুযায়ী স্ক্রিনিং সম্পন্ন',
    whatsappMessage: 'হ্যালো, Roktobondhu Bangladesh-এ আপনার নম্বর পেয়েছি। আপনি কি সাহায্য করতে পারবেন?',
    whatsappLabel: '{name}-কে WhatsApp-এ মেসেজ দিন',
    notAvailableNow: 'এখন দিতে পারবেন না',
    checking: 'দেখা হচ্ছে...',
    showNumber: 'নম্বর দেখুন',
    profile: 'প্রোফাইল'
  }
);

interface DonorsNetworkProps {
  donors: DonorProfile[];
  // 'loading'/'error' mean the list has never loaded, so an empty `donors`
  // says nothing about the filters -- don't claim "no donors match".
  loadStatus: 'loading' | 'ready' | 'error';
  onRetryLoad: () => void;
  currentUserId: string | null;
  onSelectDonor: (donor: DonorProfile) => void;
  onRequestBlood: () => void;
  onRequireAuth: () => void;
}

export const DonorsNetwork: React.FC<DonorsNetworkProps> = ({
  donors,
  loadStatus,
  onRetryLoad,
  currentUserId,
  onSelectDonor,
  onRequestBlood,
  onRequireAuth
}) => {
  const { s, f, lang } = useStrings(S);
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
    <section className="p-6 lg:p-10 lg:overflow-hidden flex flex-col lg:h-full bg-white dark:bg-slate-900 min-w-0">
      {/* Header Bar */}
      {/* The count is the only status worth stating, so it sits in the heading
          rather than in a decorative badge above it. */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">{s.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loadStatus === 'loading'
              ? s.loading
              : loadStatus === 'error'
                ? s.loadFailed
                : donors.length === 0
                  ? s.noneMatch
                  : f(donors.length === 1 ? s.matchOne : s.matchMany, { count: donors.length })}
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 lg:overflow-y-auto custom-scroll lg:pr-2 pb-12">
        {loadStatus === 'loading' && donors.length === 0 ? (
          <div className="text-center py-20 text-sm text-slate-500" role="status">
            {s.loading}
          </div>
        ) : loadStatus === 'error' && donors.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/60 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-700 p-8" role="alert">
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-200">{s.loadFailed}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
              {s.loadFailedHelp}
            </p>
            <button
              onClick={onRetryLoad}
              className="mt-6 px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-bold text-sm rounded-xl transition-colors"
            >
              {s.tryAgain}
            </button>
          </div>
        ) : donors.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/60 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-700 p-8">
            <Sparkles className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-200">{s.emptyTitle}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
              {s.emptyHelp}
            </p>
            <button
              onClick={onRequestBlood}
              className="mt-6 px-6 py-3.5 blood-gradient text-white font-black uppercase text-xs rounded-xl shadow-lg"
            >
              {s.broadcast}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {donors.map((donor, idx) => (
              <motion.div
                key={donor.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(idx, 10) * 0.03, ease: 'easeOut' }}
                whileHover={{ y: -3, transition: { duration: 0.15 } }}
                className="group bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-lg transition-all flex flex-col"
              >
                {/* The blood group is the one thing someone is scanning for,
                    so it anchors the card instead of hiding in a corner. */}
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-16 h-16 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 flex flex-col items-center justify-center">
                    <span className="font-mono text-xl font-black text-rose-600 dark:text-rose-400 leading-none">
                      {donor.bloodGroup}
                    </span>
                    {calculateAge(donor.birthYear) !== null && (
                      <span className="font-mono text-[9px] font-bold text-rose-400 mt-0.5">{f(s.ageShort, { age: calculateAge(donor.birthYear)! })}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-brand-ink dark:text-brand-green-light truncate">{donor.name}</h3>
                    </div>

                    <p className="text-sm text-slate-500 truncate mt-0.5">
                      {[donor.area, donor.district].filter(Boolean).join(', ') || s.locationNotSet}
                    </p>

                    <p className="text-xs text-slate-400 mt-1.5">
                      {isDonorAvailableNow(donor) ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{s.availableNow}</span>
                      ) : (
                        <span>{s.notAvailable}</span>
                      )}
                      {donor.donationCount
                        ? f(s.donatedTimes, { count: donor.donationCount })
                        : s.firstTime}
                    </p>

                    {donor.lastDonationDate && (
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {s.lastDonated} <span className="font-bold text-slate-700 dark:text-slate-300">{formatDate(donor.lastDonationDate, lang)}</span>
                      </p>
                    )}
                    {!isDonorAvailableNow(donor) && donor.nextEligibleDate && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5 mt-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-lg px-2 py-1 w-fit">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        {lang === 'bn' ? (
                          <><span className="font-black">{formatDate(donor.nextEligibleDate, lang)}</span> থেকে {s.availableFrom}</>
                        ) : (
                          <>{s.availableFrom} <span className="font-black">{donor.nextEligibleDate}</span></>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {donor.screeningCompletionPublic && (
                  <span className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {s.screeningComplete}
                  </span>
                )}

                {/* One action, and it does the actual job. */}
                <div className="mt-4 flex items-center gap-2">
                  {isDonorAvailableNow(donor) ? (
                    revealedContacts[donor.id]?.phone ? (
                      <div className="flex-1 flex items-center gap-2">
                        <a href={`tel:${revealedContacts[donor.id].phone}`} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold text-center transition-colors">
                          {revealedContacts[donor.id].phone}
                        </a>
                        {revealedContacts[donor.id]?.whatsapp && getWhatsAppUrl(revealedContacts[donor.id].whatsapp, s.whatsappMessage) && (
                          <a
                            href={getWhatsAppUrl(revealedContacts[donor.id].whatsapp, s.whatsappMessage) || undefined}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={f(s.whatsappLabel, { name: donor.name })}
                            className="w-11 h-11 inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ) : revealedContacts[donor.id] ? (
                      <span className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl text-sm font-semibold text-center">{s.notAvailableNow}</span>
                    ) : (
                      <button onClick={() => revealContact(donor.id)} disabled={revealingDonorId !== null} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold text-center transition-colors disabled:opacity-60">
                        {revealingDonorId === donor.id ? s.checking : s.showNumber}
                      </button>
                    )
                  ) : (
                    <span className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl text-sm font-semibold text-center">{s.notAvailableNow}</span>
                  )}

                  <button
                    onClick={() => onSelectDonor(donor)}
                    className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    {s.profile}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
