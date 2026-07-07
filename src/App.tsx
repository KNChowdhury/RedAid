import React, { useEffect, useRef, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { AiHealthAdvisor } from './components/AiHealthAdvisor';
import { DonorsNetwork } from './components/DonorsNetwork';
import { EmergencyFeed } from './components/EmergencyFeed';
import { HospitalPortal } from './components/HospitalPortal';
import { AuthModal, NotificationsModal, ProfileModal, ProfileEditModal, RequestBloodModal } from './components/Modals';
import { Navbar } from './components/Navbar';
import { RewardsHub } from './components/RewardsHub';
import { SidebarStats } from './components/SidebarStats';
import { createRequestInDb, deleteRequestFromDb, filterDonors, fetchSharedData, getAppState, saveAppState, getCurrentDonorFromSession, signOutDonor, toggleDonorVerification, updateDonorProfile } from './services/lifelineService';
import { DonorProfile, EmergencyRequest, SearchFilters } from './types';

export function App() {
  const [state, setState] = useState(getAppState);
  const [activeTab, setActiveTab] = useState('network'); // 'network' | 'requests' | 'map' | 'rewards' | 'ai-advisor' | 'hospital' | 'admin'

  // Search Filter State
  const [filters, setFilters] = useState<SearchFilters>({
    bloodGroup: 'ALL',
    district: 'ALL',
    area: 'ALL',
    verifiedOnly: false,
    nonSmokerOnly: false,
    regularOnly: false,
    availableNowOnly: false,
    maxDistanceKm: 0
  });

  // Modal Dialogs Control
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [selectedProfileDonor, setSelectedProfileDonor] = useState<DonorProfile | null>(null);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  // Keep state synced to localStorage
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Restore Supabase auth session on startup
  useEffect(() => {
    async function restoreSession() {
      const donor = await getCurrentDonorFromSession();
      setState(prev => ({
        ...prev,
        currentUser: donor,
        donors: donor ? (prev.donors.some(d => d.id === donor.id) ? prev.donors : [donor, ...prev.donors]) : prev.donors
      }));
    }
    restoreSession();
  }, []);

  const requestsPollRef = useRef<string[]>([]);

  useEffect(() => {
    async function loadSharedData() {
      try {
        const shared = await fetchSharedData();
        setState(prev => ({
          ...prev,
          donors: shared.donors.length ? shared.donors : prev.donors,
          requests: shared.requests.length ? shared.requests : prev.requests,
          badges: shared.badges.length ? shared.badges : prev.badges
        }));
        requestsPollRef.current = shared.requests.map(r => r.id);
      } catch (error) {
        console.error('Failed to fetch shared Supabase data:', error);
      }
    }
    loadSharedData();
  }, []);

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const shared = await fetchSharedData();
        setState(prev => {
          const existingIds = new Set(prev.requests.map(r => r.id));
          const newRequests = shared.requests.filter(r => !existingIds.has(r.id));
          const newNotifications = newRequests.map(newReq => ({
            id: `notif-${Date.now()}-${newReq.id}`,
            title: `New request: ${newReq.bloodGroup}`,
            message: `${newReq.patientName} needs ${newReq.requiredBags} bags at ${newReq.hospitalName}.`,
            type: 'emergency' as const,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            relatedBloodGroup: newReq.bloodGroup,
            relatedRequestId: newReq.id
          }));

          if (newNotifications.length > 0) {
            return {
              ...prev,
              donors: shared.donors.length ? shared.donors : prev.donors,
              requests: shared.requests,
              badges: shared.badges.length ? shared.badges : prev.badges,
              notifications: [...newNotifications, ...prev.notifications]
            };
          }

          return {
            ...prev,
            donors: shared.donors.length ? shared.donors : prev.donors,
            requests: shared.requests.length ? shared.requests : prev.requests,
            badges: shared.badges.length ? shared.badges : prev.badges
          };
        });
      } catch (error) {
        console.error('Failed to auto-refresh Supabase data:', error);
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  // Current User coordinates
  const currentLat = state.currentUser?.lat || 23.8103;
  const currentLng = state.currentUser?.lng || 90.4125;

  const filteredDonorsList = filterDonors(state.donors, filters, currentLat, currentLng);
  const unreadNotifsCount = state.notifications.filter(n => !n.read).length;

  /* Handlers */
  const handleAddNewRequest = async (reqData: Partial<EmergencyRequest>) => {
    const savedReq = await createRequestInDb(reqData);
    const newReq = savedReq || (reqData as EmergencyRequest);

    setState(prev => ({
      ...prev,
      requests: [newReq, ...prev.requests],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: `🚨 Emergency: ${newReq.requiredBags} Bags ${newReq.bloodGroup} Needed`,
          message: `${newReq.patientName} at ${newReq.hospitalName}, ${newReq.area}.`,
          type: 'emergency',
          time: 'Just now',
          read: false
        },
        ...prev.notifications
      ]
    }));
    setActiveTab('requests');
  };

  const handleLoginSuccess = (user: DonorProfile) => {
    setState(prev => ({
      ...prev,
      currentUser: user,
      donors: prev.donors.some(d => d.id === user.id) ? prev.donors : [user, ...prev.donors]
    }));
  };

  const handleLogout = async () => {
    await signOutDonor();
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const handleToggleCurrentUserAvailability = () => {
    if (!state.currentUser) return;
    const updatedUser = { ...state.currentUser, availableNow: !state.currentUser.availableNow };
    setState(prev => ({
      ...prev,
      currentUser: updatedUser,
      donors: prev.donors.map(d => d.id === updatedUser.id ? updatedUser : d)
    }));
    if (selectedProfileDonor && selectedProfileDonor.id === updatedUser.id) {
      setSelectedProfileDonor(updatedUser);
    }
  };

  const handleOpenProfileEdit = () => {
    setIsProfileEditOpen(true);
  };

  const handleSaveProfile = (updated: DonorProfile) => {
    setState(prev => ({
      ...prev,
      currentUser: updated,
      donors: prev.donors.map(d => d.id === updated.id ? updated : d)
    }));
    if (selectedProfileDonor && selectedProfileDonor.id === updated.id) {
      setSelectedProfileDonor(updated);
    }
    // Add a temporary in-app notification so user sees a confirmation
    setState(prev => ({
      ...prev,
      notifications: [
        {
          id: `notif-save-${Date.now()}`,
          title: 'Profile updated',
          message: 'Your profile changes have been saved successfully.',
          type: 'system',
          time: 'Just now',
          read: false
        },
        ...prev.notifications
      ]
    }));
  };

  const handleDeleteRequest = async (reqId: string) => {
    const deleted = await deleteRequestFromDb(reqId);
    if (!deleted) return;
    setState(prev => ({
      ...prev,
      requests: prev.requests.filter(r => r.id !== reqId)
    }));
  };

  const handleToggleVerifyUser = (userId: string) => {
    (async () => {
      const donor = state.donors.find(d => d.id === userId);
      if (!donor) return;
      const newVerified = !donor.isVerified;
      const toggled = await toggleDonorVerification(donor.id, newVerified);
      if (toggled) {
        setState(prev => ({
          ...prev,
          donors: prev.donors.map(d => d.id === userId ? { ...d, isVerified: newVerified } : d),
          currentUser: prev.currentUser?.id === userId ? { ...prev.currentUser, isVerified: newVerified } : prev.currentUser
        }));
      } else {
        // fallback to optimistic local toggle
        setState(prev => ({
          ...prev,
          donors: prev.donors.map(d => d.id === userId ? { ...d, isVerified: !d.isVerified } : d)
        }));
      }
    })();
  };

  const handleMarkAllNotificationsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true }))
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60 font-sans text-slate-900 selection:bg-rose-500 selection:text-white antialiased">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={state.currentUser}
        unreadCount={unreadNotifsCount}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setSelectedProfileDonor(state.currentUser)}
        onOpenNotifications={() => setIsNotifModalOpen(true)}
        onOpenRequestModal={() => setIsRequestModalOpen(true)}
        onLogout={handleLogout}
      />

      <div className="mx-auto w-full max-w-[1600px] px-6 lg:px-10 py-4">
        {state.currentUser ? (
          <div className="rounded-[2rem] border border-rose-200/80 bg-rose-50/90 p-6 shadow-lg shadow-rose-200/40 animate-in slide-in-from-top duration-300">
            <p className="text-sm uppercase font-bold tracking-[0.35em] text-rose-600">Welcome back</p>
            <h1 className="mt-2 text-3xl lg:text-4xl font-black text-slate-900">{state.currentUser.name}</h1>
            <p className="mt-3 text-sm lg:text-base text-slate-700 max-w-2xl">
              Great to see you again! Your Lifeline dashboard is ready with the latest donor network and emergency requests.
            </p>
          </div>
        ) : (
          <div className="rounded-[2.5rem] border border-slate-300/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-8 shadow-2xl shadow-slate-900/30 text-white animate-in fade-in duration-300">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase font-semibold tracking-[0.45em] text-rose-400">Guest mode</p>
                <h1 className="mt-3 text-3xl lg:text-4xl font-black tracking-tight">Welcome to LifelineBD</h1>
                <p className="mt-4 text-sm lg:text-base text-slate-300 max-w-2xl leading-7">
                  You're browsing as a guest for now. No need to worry — click sign in to unlock your personalized donor dashboard and emergency alerts.
                </p>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="mt-4 lg:mt-0 inline-flex items-center justify-center rounded-full bg-rose-500 px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-rose-500/30 transition-transform duration-300 hover:-translate-y-1 hover:bg-rose-400"
              >
                Get Started
              </button>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-3xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm animate-pulse">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Fast access</p>
                <p className="mt-2 text-sm font-bold text-white">Sign in quickly</p>
              </div>
              <div className="rounded-3xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm animate-pulse delay-100">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Real data</p>
                <p className="mt-2 text-sm font-bold text-white">View live requests</p>
              </div>
              <div className="rounded-3xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm animate-pulse delay-200">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Safe steps</p>
                <p className="mt-2 text-sm font-bold text-white">Join the community</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Structural Frame */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] min-h-[calc(100vh-5rem)]">
        {/* Left Smart Filter & Impact Sidebar */}
        <SidebarStats
          currentUser={state.currentUser}
          filters={filters}
          setFilters={setFilters}
          onSearch={() => setActiveTab('network')}
          donorsCount={filteredDonorsList.length}
        />

        {/* Right Active Workspace Container */}
        <div className="flex-1 overflow-hidden h-full flex flex-col bg-white">
          {activeTab === 'network' && (
            <DonorsNetwork
              donors={filteredDonorsList}
              filters={filters}
              onSelectDonor={d => setSelectedProfileDonor(d)}
              onRequestBlood={() => setIsRequestModalOpen(true)}
            />
          )}

          {activeTab === 'requests' && (
            <EmergencyFeed
              requests={state.requests}
              onSelectRequest={r => alert(`Selected request for ${r.patientName}. Hospital: ${r.hospitalName}.`)}
              onRequestBlood={() => setIsRequestModalOpen(true)}
            />
          )}

          {activeTab === 'map' && (
            <DonorsNetwork
              donors={filteredDonorsList}
              filters={filters}
              onSelectDonor={d => setSelectedProfileDonor(d)}
              onRequestBlood={() => setIsRequestModalOpen(true)}
            />
          )}

          {activeTab === 'rewards' && (
            <RewardsHub
              currentUser={state.currentUser}
              badges={state.badges}
              leaderboard={state.donors.slice(0, 8)}
            />
          )}

          {activeTab === 'ai-advisor' && (
            <AiHealthAdvisor currentUser={state.currentUser} />
          )}

          {activeTab === 'hospital' && (
            <HospitalPortal
              requests={state.requests}
              onRequestBlood={() => setIsRequestModalOpen(true)}
            />
          )}

          {activeTab === 'admin' && (
            <AdminDashboard
              donors={state.donors}
              requests={state.requests}
              onDeleteRequest={handleDeleteRequest}
              onToggleVerifyUser={handleToggleVerifyUser}
            />
          )}
        </div>
      </main>

      {/* Dialog Modals Overlay */}
      <RequestBloodModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmit={handleAddNewRequest}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <ProfileModal
        donor={selectedProfileDonor}
        onClose={() => setSelectedProfileDonor(null)}
        onToggleAvailability={selectedProfileDonor?.id === state.currentUser?.id ? handleToggleCurrentUserAvailability : undefined}
        onProfileUpdated={(updated) => {
          setState(prev => ({
            ...prev,
            currentUser: prev.currentUser?.id === updated.id ? updated : prev.currentUser,
            donors: prev.donors.map(d => d.id === updated.id ? updated : d)
          }));
          setSelectedProfileDonor(updated);
        }}
      />

      <ProfileEditModal
        donor={state.currentUser}
        isOpen={isProfileEditOpen}
        onClose={() => setIsProfileEditOpen(false)}
        onSave={handleSaveProfile}
      />

      <NotificationsModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        notifications={state.notifications}
        onMarkAllRead={handleMarkAllNotificationsRead}
      />
    </div>
  );
}

export default App;
