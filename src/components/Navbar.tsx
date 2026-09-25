import { Bell, LogOut, Menu, Moon, Sun, User, X } from 'lucide-react';
import React, { useState } from 'react';
import { DonorProfile } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Avatar } from './Avatar';

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
  const { isDark, toggleTheme } = useTheme();

  const baseNavItems = [
    { id: 'network', label: 'Network' },
    { id: 'requests', label: 'Requests' },
    { id: 'success', label: 'Success Stories' },
    { id: 'rewards', label: 'Rewards' },
    { id: 'faq', label: 'FAQ' }
  ];

  const navItems = currentUser?.role === 'admin'
    ? [...baseNavItems, { id: 'admin', label: 'Admin' }]
    : baseNavItems;

  const visibleNavItems = navItems;

  return (
    <header className="h-20 flex items-center justify-between gap-4 lg:gap-6 px-2 sm:px-6 lg:px-10 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      {/* Brand Logo */}
      <div
        className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5 cursor-pointer group"
        onClick={() => setActiveTab('network')}
      >
        <img
          src="/favicon.svg"
          alt="Roktobondhu Bangladesh"
          className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform"
        />
        <div className="flex flex-col min-w-0">
          <span className="block truncate text-sm sm:text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-slate-100 leading-none">
            Roktobondhu<span className="text-rose-600 dark:text-rose-400"> Bangladesh</span>
          </span>
          {/* Wraps to a second line and looks cramped below ~400px, so it's
              desktop/tablet-only; the wordmark alone reads fine on its own. */}
          <span className="hidden sm:block text-[9px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Save Life By Your Blood</span>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden xl:flex items-center gap-4 2xl:gap-6 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {visibleNavItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`transition-colors relative py-2 ${
              activeTab === item.id ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'hover:text-rose-600 dark:hover:text-rose-400'
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
      <div className="flex shrink-0 items-center gap-1 sm:gap-3 md:gap-4">
        {/* Emergency Request CTA Button */}
        <button
          onClick={onOpenRequestModal}
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 blood-gradient text-white rounded-xl font-extrabold uppercase text-xs tracking-wider shadow-lg shadow-rose-500/25 hover:opacity-95 active:scale-95 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          Request Blood
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="hidden sm:block p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          className="relative hidden sm:block p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
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
          <div className="flex items-center gap-3 md:pl-2 md:border-l border-slate-200 dark:border-slate-700">
            {/* Between xl (1280px, where the desktop nav appears) and 2xl
                (1536px), this text plus the nav plus REQUEST BLOOD simply
                don't fit -- the logo (the only flexible element) got starved
                and truncated hard. Hidden in exactly that range; still shown
                on tablets (nav is hidden there, so there's no competition)
                and on wide screens (2xl+, plenty of room again). */}
            <div className="hidden md:block xl:hidden 2xl:block text-right cursor-pointer" onClick={onOpenProfile}>
              <div className="flex items-center justify-end gap-1">
                <p className="text-[10px] uppercase font-extrabold tracking-wider text-rose-600 dark:text-rose-400">
                  {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'hospital' ? 'Hospital' : 'Donor'}
                </p>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[9rem] 2xl:max-w-[12rem]">{currentUser.name}</p>
            </div>

            <div
              onClick={onOpenProfile}
              className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-rose-500 overflow-hidden cursor-pointer shadow-sm relative group"
            >
              <Avatar name={currentUser.name} src={currentUser.avatar} className="w-full h-full" textClassName="text-xs" />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>

            <button
              onClick={onLogout}
              aria-label="Sign out"
              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors hidden sm:block"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="hidden sm:block px-3.5 sm:px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors"
          >
            Sign In
          </button>
        )}

        {/* Hamburger Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="xl:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 shadow-2xl xl:hidden flex flex-col gap-4 animate-in slide-in-from-top duration-200 z-50">
          <div className="grid grid-cols-2 gap-3">
            {visibleNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`py-3 px-4 rounded-xl text-left font-bold uppercase text-xs tracking-wider transition-all ${
                  activeTab === item.id
                    ? 'blood-gradient text-white shadow-md shadow-rose-500/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400'
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

          <div className="flex gap-3 sm:hidden">
            <button
              onClick={() => {
                onOpenNotifications();
                setMobileMenuOpen(false);
              }}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold uppercase text-xs tracking-widest"
            >
              Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {currentUser ? (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3" onClick={() => { onOpenProfile(); setMobileMenuOpen(false); }}>
                <Avatar name={currentUser.name} src={currentUser.avatar} className="w-10 h-10" textClassName="text-xs" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{currentUser.name}</p>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">{currentUser.bloodGroup} • {currentUser.area}, {currentUser.district}</p>
                </div>
              </div>
              <button
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg text-xs font-bold uppercase"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}
              className="w-full py-3 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest"
            >
              Donor Registration / Login
            </button>
          )}
        </div>
      )}
    </header>
  );
};
