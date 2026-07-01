import confetti from 'canvas-confetti';
import { Award, CalendarCheck, Crown, Download, Heart, ShieldCheck, Trophy, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { DonorProfile, RewardBadge } from '../types';

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
      case 'Heart': return <Heart className="w-6 h-6 text-rose-600 fill-rose-100" />;
      case 'ShieldCheck': return <ShieldCheck className="w-6 h-6 text-emerald-600" />;
      case 'CalendarCheck': return <CalendarCheck className="w-6 h-6 text-blue-600" />;
      case 'Crown': return <Crown className="w-6 h-6 text-amber-500" />;
      case 'Zap': return <Zap className="w-6 h-6 text-purple-600" />;
      default: return <Award className="w-6 h-6 text-rose-600" />;
    }
  };

  return (
    <section className="p-6 lg:p-10 overflow-y-auto custom-scroll h-full bg-white space-y-10 pb-20">
      {/* Title Header */}
      <header className="border-b border-slate-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
            LifelineBD Recognition Hub
          </span>
          <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 leading-tight mt-3">
            Rewards, Badges &<br />
            <span className="text-rose-600">Honors.</span>
          </h1>
        </div>

        {/* User Hero Rank Summary */}
        {currentUser && (
          <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 flex items-center gap-5 shadow-xl">
            <div className="w-14 h-14 blood-gradient rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Your National Standing</p>
              <p className="text-2xl font-mono font-black text-white">{currentUser.impactScore} <span className="text-xs text-rose-400 font-sans">Points</span></p>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">🎖️ Rank #4 Nationwide</p>
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
                Government Verified Honour
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold editorial-title mt-1.5">Official Life Saver Certificate</h2>
              <p className="text-xs sm:text-sm text-rose-100 mt-1 max-w-xl font-medium">
                You have completed verified hospital blood donations. Download your official recognition certificate signed by LifelineBD & DGHS Medical Board.
              </p>
            </div>
          </div>

          <button
            onClick={handleClaimCertificate}
            className="w-full md:w-auto px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all shrink-0 flex items-center justify-center gap-2 z-10 cursor-pointer"
          >
            <Download className="w-4 h-4 text-rose-600" />
            Generate Certificate
          </button>
        </div>
      )}

      {/* Achievements Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Achievements Showcase</h2>
            <p className="text-lg font-bold text-slate-800 mt-0.5">Unlock Badges By Saving Lives</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            {badges.filter(b => b.achieved).length} / {badges.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge, idx) => {
            const currentPts = currentUser?.impactScore || 100;
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
                  ? 'bg-white border-rose-200/80 shadow-md shadow-rose-500/5' 
                  : 'bg-slate-50/80 border-slate-200/60 opacity-65 grayscale-[0.6]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    badge.achieved ? 'bg-rose-50 shadow-sm' : 'bg-slate-200'
                  }`}>
                    {renderBadgeIcon(badge.icon)}
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg ${
                    badge.achieved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {badge.pointsRequired} Pts
                  </span>
                </div>

                <h3 className="font-extrabold text-lg text-slate-900">{badge.name}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{badge.description}</p>

                {/* Animated Framer Motion Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-mono font-bold mb-1 text-slate-400">
                    <span>Progress ({currentPts}/{badge.pointsRequired} pts)</span>
                    <span className={badge.achieved ? 'text-emerald-600 font-black' : 'text-rose-600'}>{progressPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60 shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + idx * 0.08, ease: "easeOut" }}
                      className={`h-full rounded-full ${badge.achieved ? 'bg-emerald-500' : 'blood-gradient'}`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">Category: {badge.category}</span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  badge.achieved ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {badge.achieved ? '✓ Achieved' : '🔒 Locked'}
                </span>
              </div>
            </motion.div>
            );
          })}
        </div>
      </section>

      {/* National Leaderboard */}
      <section className="bg-slate-50 rounded-[2.5rem] p-6 lg:p-8 border border-slate-200/80">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hall of Fame</span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">Top Lifeline Contributors</h2>
          </div>
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider bg-rose-100 px-3 py-1 rounded-full">
            🔥 Updated Hourly
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
                    ? 'bg-rose-50 border-rose-300 shadow-md' 
                    : 'bg-white border-slate-200/80 hover:shadow-sm'
                }`}
              >
                <span className={`w-8 h-8 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                  idx === 0 ? 'bg-amber-400 text-slate-950 shadow-md' :
                  idx === 1 ? 'bg-slate-300 text-slate-900' :
                  idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                </span>

                <img src={user.avatar} alt="" className="w-11 h-11 rounded-xl object-cover border border-slate-200" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-slate-900 truncate">{user.name}</p>
                    {user.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                    {user.id === currentUser?.id && (
                      <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded uppercase">You</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    🩸 {user.bloodGroup} • {user.district} • {user.livesSaved} Lives Saved
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-base font-mono font-black text-slate-900">{user.impactScore.toLocaleString()}</p>
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Lifeline Pts</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Official Certificate Dialog Modal */}
      {showCertificateModal && currentUser && (
        <div className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] p-8 lg:p-12 max-w-3xl w-full border-8 border-double border-rose-600 shadow-2xl text-center relative overflow-hidden">
            <button
              onClick={() => setShowCertificateModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
            >
              ✕
            </button>

            <div className="w-20 h-20 blood-gradient rounded-full mx-auto flex items-center justify-center text-white mb-6 shadow-xl shadow-rose-500/30">
              <Award className="w-10 h-10" />
            </div>

            <p className="text-xs uppercase tracking-[0.3em] font-black text-slate-400">People's Republic of Bangladesh • LifelineBD Network</p>
            <h2 className="editorial-title text-4xl sm:text-5xl font-black text-slate-900 my-4">Certificate of Appreciation</h2>
            
            <p className="text-sm text-slate-600 max-w-lg mx-auto font-medium leading-relaxed">
              This official honour is proudly awarded to
            </p>
            <p className="text-3xl font-black text-rose-600 font-serif border-b-2 border-slate-200 inline-block px-8 py-2 my-2">
              {currentUser.name}
            </p>
            <p className="text-sm text-slate-600 max-w-lg mx-auto font-medium leading-relaxed mt-2">
              For voluntary, verified blood donation ({currentUser.bloodGroup}) and demonstrating supreme humanitarian spirit in saving {currentUser.livesSaved} lives.
            </p>

            <div className="grid grid-cols-2 gap-8 mt-10 pt-8 border-t border-slate-200 max-w-md mx-auto text-center">
              <div>
                <p className="font-serif italic font-bold text-slate-800">Dr. Kawsar Chowdhury</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Chief Medical Advisor</p>
              </div>
              <div>
                <p className="font-serif italic font-bold text-slate-800">LifelineBD Registrar</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">National Blood Bank</p>
              </div>
            </div>

            <button
              onClick={() => {
                alert('Official PDF Certificate downloaded.');
                setShowCertificateModal(false);
              }}
              className="mt-8 px-8 py-4 blood-gradient text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl cursor-pointer"
            >
              📄 Print / Download PDF
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
