import { Award, Bell, Heart, LogOut, Menu, ShieldCheck, User, X } from 'lucide-react';
import React, { useState } from 'react';
import { DonorProfile } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: DonorProfile | null;
  unreadCount: number;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onOpenRequestModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  unreadCount,
  onOpenAuth,
  onOpenProfile,
  onOpenNotifications,
  onOpenRequestModal,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'network', label: 'Network' },
    { id: 'requests', label: 'Requests' },
    { id: 'map', label: 'Live Map' },
    { id: 'rewards', label: 'Rewards' },
    { id: 'ai-advisor', label: 'AI Health Hub' },
    { id: 'hospital', label: 'Hospital Portal' },
    { id: 'admin', label: 'Admin' }
  ];

  return (
    <header className="h-20 flex items-center justify-between px-6 lg:px-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      {/* Brand Logo */}
      <div 
        className="flex items-center gap-2.5 cursor-pointer group"
        onClick={() => setActiveTab('network')}
      >
        <div className="w-10 h-10 blood-gradient rounded-xl flex items-center justify-center shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
          <Heart className="w-5 h-5 text-white fill-white animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tighter uppercase text-slate-900 leading-none">
            Lifeline<span className="text-rose-600">BD</span>
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Every Drop Saves a Life</span>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden xl:flex items-center gap-7 text-xs font-bold uppercase tracking-widest text-slate-500">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`transition-colors relative py-2 ${
              activeTab === item.id ? 'text-rose-600 font-extrabold' : 'hover:text-rose-600'
            }`}
          >
            {item.label}
            {activeTab === item.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 blood-gradient rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Right User Actions */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Emergency Request CTA Button */}
        <button
          onClick={onOpenRequestModal}
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 blood-gradient text-white rounded-xl font-extrabold uppercase text-xs tracking-wider shadow-lg shadow-rose-500/25 hover:opacity-95 active:scale-95 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          Request Blood
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile / Auth CTA */}
        {currentUser ? (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="hidden md:block text-right cursor-pointer" onClick={onOpenProfile}>
              <div className="flex items-center justify-end gap-1">
                {currentUser.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />}
                <p className="text-[10px] uppercase font-extrabold tracking-wider text-rose-600">
                  {currentUser.role === 'admin' ? 'System Admin' : currentUser.role === 'hospital' ? 'Verified Hospital' : 'Verified Donor'}
                </p>
              </div>
              <p className="text-sm font-bold text-slate-900 leading-tight">{currentUser.name}</p>
            </div>

            <div 
              onClick={onOpenProfile}
              className="w-11 h-11 rounded-2xl bg-slate-100 border-2 border-rose-500 overflow-hidden cursor-pointer shadow-sm relative group"
            >
              <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 transition-colors hidden sm:block"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Sign In
          </button>
        )}

        {/* Hamburger Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="xl:hidden p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-6 shadow-2xl xl:hidden flex flex-col gap-4 animate-in slide-in-from-top duration-200 z-50">
          <div className="grid grid-cols-2 gap-3">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`py-3 px-4 rounded-xl text-left font-bold uppercase text-xs tracking-wider transition-all ${
                  activeTab === item.id 
                    ? 'blood-gradient text-white shadow-md shadow-rose-500/20' 
                    : 'bg-slate-50 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              onOpenRequestModal();
              setMobileMenuOpen(false);
            }}
            className="w-full py-3.5 blood-gradient text-white rounded-xl font-black uppercase text-xs tracking-widest text-center shadow-lg sm:hidden"
          >
            🚨 Emergency Blood Request
          </button>

          {currentUser ? (
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3" onClick={() => { onOpenProfile(); setMobileMenuOpen(false); }}>
                <img src={currentUser.avatar} alt="" className="w-10 h-10 rounded-xl border border-rose-500" />
                <div>
                  <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                  <p className="text-[10px] text-rose-600 font-semibold">{currentUser.bloodGroup} • {currentUser.district}</p>
                </div>
              </div>
              <button
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                className="px-3 py-2 bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg text-xs font-bold uppercase"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest"
            >
              Donor Registration / Login
            </button>
          )}
        </div>
      )}
    </header>
  );
};
