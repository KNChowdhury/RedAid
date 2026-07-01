import React, { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { AiHealthAdvisor } from './components/AiHealthAdvisor';
import { DonorsNetwork } from './components/DonorsNetwork';
import { EmergencyFeed } from './components/EmergencyFeed';
import { HospitalPortal } from './components/HospitalPortal';
import { AuthModal, NotificationsModal, ProfileModal, RequestBloodModal } from './components/Modals';
import { Navbar } from './components/Navbar';
import { RewardsHub } from './components/RewardsHub';
import { SidebarStats } from './components/SidebarStats';
import { filterDonors, getAppState, saveAppState } from './services/lifelineService';
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

  // Keep state synced to localStorage
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Current User coordinates
  const currentLat = state.currentUser?.lat || 23.8103;
  const currentLng = state.currentUser?.lng || 90.4125;

  const filteredDonorsList = filterDonors(state.donors, filters, currentLat, currentLng);
  const unreadNotifsCount = state.notifications.filter(n => !n.read).length;

  /* Handlers */
  const handleAddNewRequest = (reqData: Partial<EmergencyRequest>) => {
    const newReq = reqData as EmergencyRequest;
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

  const handleLogout = () => {
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

  const handleDeleteRequest = (reqId: string) => {
    setState(prev => ({
      ...prev,
      requests: prev.requests.filter(r => r.id !== reqId)
    }));
  };

  const handleToggleVerifyUser = (userId: string) => {
    setState(prev => ({
      ...prev,
      donors: prev.donors.map(d => d.id === userId ? { ...d, isVerified: !d.isVerified } : d)
    }));
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
