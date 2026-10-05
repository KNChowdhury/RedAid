import confetti from 'canvas-confetti';
import { Award, CalendarCheck, Crown, Download, Heart, ShieldCheck, Trophy, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { defineStrings, formatNumber, useStrings } from '../i18n';
import { DonorProfile, RewardBadge } from '../types';
import { Avatar } from './Avatar';

const S = defineStrings(
  {
    hubTag: 'Roktobondhu Bangladesh Recognition Hub',
    titleLine1: 'Rewards, Badges &',
    titleLine2: 'Honors.',
    nationalStanding: 'Your National Standing',
    points: 'Points',
    rank: '🎖️ Rank #{rank} on this leaderboard',
    certBannerTag: 'Government Verified Honour',
    certBannerTitle: 'Official Life Saver Certificate',
    certBannerBody: 'You have completed verified hospital blood donations. Download your official recognition certificate signed by Roktobondhu Bangladesh & DGHS Medical Board.',
    generateCertificate: 'Generate Certificate',
    achievementsTag: 'Achievements Showcase',
    achievementsTitle: 'Unlock Badges By Saving Lives',
    unlockedCount: '{done} / {total} Unlocked',
    badgePoints: '{points} Pts',
    progress: 'Progress ({current}/{required} pts)',
    category: 'Category: {category}',
    // Badge categories are stored codes; English shows the code as before.
    categoryDonation: 'donation',
    categoryStreak: 'streak',
    categoryEmergency: 'emergency',
    categoryVerified: 'verified',
    achieved: '✓ Achieved',
    locked: '🔒 Locked',
    hallOfFame: 'Hall of Fame',
    topContributors: 'Top Roktobondhu Contributors',
    updatedHourly: '🔥 Updated Hourly',
    you: 'You',
    livesSaved: '{count} Lives Saved',
    leaderboardPoints: 'Roktobondhu Pts',
    certHeader: "People's Republic of Bangladesh • Roktobondhu Bangladesh Network",
    certTitle: 'Certificate of Appreciation',
    certAwardedTo: 'This official honour is proudly awarded to',
    certCitation: 'For voluntary, verified blood donation ({bloodGroup}) and demonstrating supreme humanitarian spirit in saving {count} lives.',
    certSigner1Title: 'Chief Medical Advisor',
    certSigner2Name: 'Roktobondhu Registrar',
    certSigner2Title: 'National Blood Bank',
    printCertificate: 'Print / Save as PDF'
  },
  {
    hubTag: 'Roktobondhu Bangladesh স্বীকৃতি কেন্দ্র',
    titleLine1: 'পুরস্কার, ব্যাজ ও',
    titleLine2: 'সম্মাননা।',
    nationalStanding: 'জাতীয় পর্যায়ে আপনার অবস্থান',
    points: 'পয়েন্ট',
    rank: '🎖️ এই লিডারবোর্ডে আপনি #{rank} স্থানে',
    certBannerTag: 'সরকারি ভেরিফায়েড সম্মাননা',
    certBannerTitle: 'অফিসিয়াল জীবনরক্ষক সনদ',
    certBannerBody: 'আপনি হাসপাতালে ভেরিফায়েড রক্তদান সম্পন্ন করেছেন। Roktobondhu Bangladesh ও DGHS মেডিকেল বোর্ড স্বাক্ষরিত আপনার অফিসিয়াল স্বীকৃতি সনদ ডাউনলোড করুন।',
    generateCertificate: 'সনদ তৈরি করুন',
    achievementsTag: 'অর্জনসমূহ',
    achievementsTitle: 'জীবন বাঁচিয়ে ব্যাজ অর্জন করুন',
    unlockedCount: '{done} / {total} আনলক হয়েছে',
    badgePoints: '{points} পয়েন্ট',
    progress: 'অগ্রগতি ({current}/{required} পয়েন্ট)',
    category: 'ধরন: {category}',
    categoryDonation: 'রক্তদান',
    categoryStreak: 'ধারাবাহিকতা',
    categoryEmergency: 'জরুরি',
    categoryVerified: 'ভেরিফায়েড',
    achieved: '✓ অর্জিত',
    locked: '🔒 লক করা',
    hallOfFame: 'সম্মাননা তালিকা',
    topContributors: 'Roktobondhu-এর শীর্ষ অবদানকারী',
    updatedHourly: '🔥 প্রতি ঘণ্টায় আপডেট',
    you: 'আপনি',
    livesSaved: '{count}টি জীবন বাঁচিয়েছেন',
    leaderboardPoints: 'পয়েন্ট',
    certHeader: 'গণপ্রজাতন্ত্রী বাংলাদেশ • Roktobondhu Bangladesh নেটওয়ার্ক',
    certTitle: 'প্রশংসাপত্র',
    certAwardedTo: 'এই অফিসিয়াল সম্মাননা সগৌরবে প্রদান করা হলো',
    certCitation: 'স্বেচ্ছায় ভেরিফায়েড রক্তদান ({bloodGroup}) এবং {count}টি জীবন বাঁচাতে মহান মানবিক চেতনার দৃষ্টান্ত স্থাপনের স্বীকৃতিস্বরূপ।',
    certSigner1Title: 'প্রধান চিকিৎসা উপদেষ্টা',
    certSigner2Name: 'Roktobondhu রেজিস্ট্রার',
    certSigner2Title: 'জাতীয় ব্লাড ব্যাংক',
    printCertificate: 'প্রিন্ট / PDF সংরক্ষণ'
  }
);

const VISIBLE_BADGE_CATEGORIES: RewardBadge['category'][] = ['donation', 'emergency', 'verified'];

interface RewardsHubProps {
  currentUser: DonorProfile | null;
  badges: RewardBadge[];
  leaderboard: DonorProfile[];
}

export const RewardsHub: React.FC<RewardsHubProps> = ({
  currentUser,
  badges,
  leaderboard
}) => {
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const { s, f, lang } = useStrings(S);

  // English keeps exactly the digits it showed before (no added grouping);
  // Bangla mode writes numbers in Bangla digits. A missing value renders
  // nothing, as the bare {value} in JSX did before.
  const num = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '';
    return lang === 'bn' ? formatNumber(value, lang) : String(value);
  };
  const groupedNum = (value: number) => (lang === 'bn' ? formatNumber(value, lang) : value.toLocaleString());

  const CATEGORY_LABEL: Record<string, string> = {
    donation: s.categoryDonation,
    streak: s.categoryStreak,
    emergency: s.categoryEmergency,
    verified: s.categoryVerified
  };
  const visibleBadges = badges.filter(badge => VISIBLE_BADGE_CATEGORIES.includes(badge.category));

  const currentUserRank = currentUser
    ? leaderboard.findIndex(donor => donor.id === currentUser.id) + 1
    : 0;

  const handleClaimCertificate = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E11D48', '#F43F5E', '#FBBF24', '#10B981']
    });
    setShowCertificateModal(true);
  };

  const renderBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Heart': return <Heart className="w-6 h-6 text-rose-600 dark:text-rose-400 fill-rose-100" />;
      case 'ShieldCheck': return <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />;
      case 'CalendarCheck': return <CalendarCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
      case 'Crown': return <Crown className="w-6 h-6 text-amber-500 dark:text-amber-400" />;
      case 'Zap': return <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />;
      default: return <Award className="w-6 h-6 text-rose-600 dark:text-rose-400" />;
    }
  };

  return (
    <section className="p-6 lg:p-10 overflow-y-auto custom-scroll h-full bg-white dark:bg-slate-900 space-y-10 pb-20">
      {/* Title Header */}
      <header className="border-b border-slate-100 dark:border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900/50">
            {s.hubTag}
          </span>
          <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 dark:text-slate-100 leading-tight mt-3">
            {s.titleLine1}<br />
            <span className="text-rose-600 dark:text-rose-400">{s.titleLine2}</span>
          </h1>
        </div>

        {/* User Hero Rank Summary */}
        {currentUser && (
          <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 p-5 rounded-3xl border border-slate-800 dark:border-slate-300 flex items-center gap-5 shadow-xl">
            <div className="w-14 h-14 blood-gradient rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600">{s.nationalStanding}</p>
              <p className="text-2xl font-mono font-black text-white dark:text-slate-900">{num(currentUser.impactScore ?? 0)} <span className="text-xs text-rose-400 dark:text-rose-600 font-sans">{s.points}</span></p>
              {currentUserRank > 0 && (
                <p className="text-xs text-emerald-400 dark:text-emerald-700 font-semibold mt-0.5">{f(s.rank, { rank: num(currentUserRank) })}</p>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Official Certificate Banner CTA */}
      {currentUser && currentUser.donationsHistory.length > 0 && (
        <div className="blood-gradient p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-rose-500/20 relative overflow-hidden group">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
          
          <div className="flex items-center gap-5 z-10">
            <div className="w-16 h-16 bg-white text-rose-600 rounded-3xl flex items-center justify-center shrink-0 shadow-2xl">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded text-white">
                {s.certBannerTag}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold editorial-title mt-1.5">{s.certBannerTitle}</h2>
              <p className="text-xs sm:text-sm text-rose-100 mt-1 max-w-xl font-medium">
                {s.certBannerBody}
              </p>
            </div>
          </div>

          <button
            onClick={handleClaimCertificate}
            className="w-full md:w-auto px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all shrink-0 flex items-center justify-center gap-2 z-10 cursor-pointer"
          >
            <Download className="w-4 h-4 text-rose-600" />
            {s.generateCertificate}
          </button>
        </div>
      )}

      {/* Achievements Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{s.achievementsTag}</h2>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{s.achievementsTitle}</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            {f(s.unlockedCount, { done: num(visibleBadges.filter(b => b.achieved).length), total: num(visibleBadges.length) })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleBadges.map((badge, idx) => {
            const currentPts = currentUser?.impactScore ?? 0;
            const progressPercent = Math.min(100, Math.round((currentPts / badge.pointsRequired) * 100));
            return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08, ease: "easeOut" }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                badge.achieved
                  ? 'bg-white dark:bg-slate-800/60 border-rose-200/80 dark:border-rose-900/50 shadow-md shadow-rose-500/5'
                  : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700 opacity-65 grayscale-[0.6]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    badge.achieved ? 'bg-rose-50 dark:bg-rose-950/30 shadow-sm' : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {renderBadgeIcon(badge.icon)}
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg ${
                    badge.achieved ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {f(s.badgePoints, { points: num(badge.pointsRequired) })}
                  </span>
                </div>

                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">{badge.name}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{badge.description}</p>

                {/* Animated Framer Motion Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-mono font-bold mb-1 text-slate-400">
                    <span>{f(s.progress, { current: num(currentPts), required: num(badge.pointsRequired) })}</span>
                    <span className={badge.achieved ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-rose-600 dark:text-rose-400'}>{num(progressPercent)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700 shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + idx * 0.08, ease: "easeOut" }}
                      className={`h-full rounded-full ${badge.achieved ? 'bg-emerald-500' : 'blood-gradient'}`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">{f(s.category, { category: CATEGORY_LABEL[badge.category] ?? badge.category })}</span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  badge.achieved ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                }`}>
                  {badge.achieved ? s.achieved : s.locked}
                </span>
              </div>
            </motion.div>
            );
          })}
        </div>
      </section>

      {/* National Leaderboard */}
      <section className="bg-slate-50 dark:bg-slate-800/60 rounded-[2.5rem] p-6 lg:p-8 border border-slate-200/80 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.hallOfFame}</span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{s.topContributors}</h2>
          </div>
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider bg-rose-100 dark:bg-rose-950/30 px-3 py-1 rounded-full">
            {s.updatedHourly}
          </span>
        </div>

        <div className="space-y-3">
          {leaderboard.map((user, idx) => {
            const isTop3 = idx < 3;
            return (
              <div
                key={user.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  user.id === currentUser?.id
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:shadow-sm'
                }`}
              >
                <span className={`w-8 h-8 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                  idx === 0 ? 'bg-amber-400 dark:bg-amber-500 text-slate-950 shadow-md' :
                  idx === 1 ? 'bg-slate-300 dark:bg-slate-400 text-slate-900' :
                  idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {idx + 1 < 10 ? `${num(0)}${num(idx + 1)}` : num(idx + 1)}
                </span>

                <Avatar name={user.name} src={user.avatar} className="w-11 h-11" textClassName="text-xs" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-brand-ink dark:text-brand-green-light truncate">{user.name}</p>
                    {user.id === currentUser?.id && (
                      <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded uppercase">{s.you}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    🩸 {user.bloodGroup} • {user.district} • {f(s.livesSaved, { count: num(user.livesSaved) })}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-base font-mono font-black text-slate-900 dark:text-slate-100">{groupedNum(user.impactScore)}</p>
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{s.leaderboardPoints}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Official Certificate Dialog Modal */}
      {showCertificateModal && currentUser && (
        <div className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 lg:p-12 max-w-3xl w-full border-8 border-double border-rose-600 shadow-2xl text-center relative overflow-hidden">
            <button
              onClick={() => setShowCertificateModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold"
            >
              ✕
            </button>

            <div className="w-20 h-20 blood-gradient rounded-full mx-auto flex items-center justify-center text-white mb-6 shadow-xl shadow-rose-500/30">
              <Award className="w-10 h-10" />
            </div>

            <p className="text-xs uppercase tracking-[0.3em] font-black text-slate-400">{s.certHeader}</p>
            <h2 className="editorial-title text-4xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 my-4">{s.certTitle}</h2>

            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto font-medium leading-relaxed">
              {s.certAwardedTo}
            </p>
            <p className="text-3xl font-black text-rose-600 dark:text-rose-400 font-serif border-b-2 border-slate-200 dark:border-slate-700 inline-block px-8 py-2 my-2">
              {currentUser.name}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto font-medium leading-relaxed mt-2">
              {f(s.certCitation, { bloodGroup: currentUser.bloodGroup, count: num(currentUser.livesSaved) })}
            </p>

            <div className="grid grid-cols-2 gap-8 mt-10 pt-8 border-t border-slate-200 dark:border-slate-700 max-w-md mx-auto text-center">
              <div>
                <p className="font-serif italic font-bold text-slate-800 dark:text-slate-200">Dr. Kawsar Chowdhury</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{s.certSigner1Title}</p>
              </div>
              <div>
                <p className="font-serif italic font-bold text-slate-800 dark:text-slate-200">{s.certSigner2Name}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{s.certSigner2Title}</p>
              </div>
            </div>

            {/* The browser's print dialog gives a real PDF via "Save as PDF",
                which is honest, works everywhere and needs no PDF library. */}
            <button
              onClick={() => window.print()}
              className="mt-8 px-8 py-4 blood-gradient text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl cursor-pointer"
            >
              {s.printCertificate}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
