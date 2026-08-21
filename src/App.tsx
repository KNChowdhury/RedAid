import React, { useRef, useEffect, useState } from 'react';
import { useBrowserNotifications } from './hooks/useBrowserNotifications';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';
import { DonorsNetwork } from './components/DonorsNetwork';
import { EmergencyFeed } from './components/EmergencyFeed';
import { HospitalPortal } from './components/HospitalPortal';
import { AuthModal, NotificationsModal, ProfileModal, ProfileEditModal, RequestBloodModal } from './components/Modals';
import { Navbar } from './components/Navbar';
import { RewardsHub } from './components/RewardsHub';
import { ConfirmDonationBanner, MarkDonatedModal, ShareRequestModal } from './components/DonationLoop';
import { SidebarStats } from './components/SidebarStats';
import { createRequestInDb, deleteRequestFromDb, updateRequestInDb, offerToDonate, fetchMyOfferedRequestIds, fetchMyPendingConfirmations, fetchMyNotifications, filterDonors, fetchSharedData, getAppState, saveAppState, getCurrentDonorFromSession, mapDbNotificationToNotification, markMyNotificationsRead, signOutDonor, subscribeToAuthState, subscribeToLiveUpdates, subscribeToNotifications, toggleDonorVerification, updateDonorAvailability } from './services/lifelineService';
import { DonorProfile, EmergencyRequest, SearchFilters } from './types';

export function App() {
  const [state, setState] = useState(getAppState);
  // Tab lives in the URL hash so the browser/Android back button moves between
  // sections instead of leaving the app on the first tap.
  const readTabFromHash = () => {
    const t = window.location.hash.replace('#', '');
    const valid = ['network', 'requests', 'map', 'rewards', 'hospital', 'admin'];
    return valid.includes(t) ? t : 'network';
  };

  const [activeTab, setActiveTabState] = useState(readTabFromHash);
  const recoveryModeRef = useRef(
    window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')
  );

  const setActiveTab = React.useCallback((tab: string) => {
    setActiveTabState(tab);
    if (tab === 'network') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } else if (window.location.hash.replace('#', '') !== tab) {
      window.history.pushState(null, '', `#${tab}`);
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => setActiveTabState(readTabFromHash());
    window.addEventListener('popstate', onHashChange);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('popstate', onHashChange);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [selectedProfileDonor, setSelectedProfileDonor] = useState<DonorProfile | null>(null);

  // Donor cards come from v_donors_directory, which deliberately excludes health
  // data. So when the selected donor IS the signed-in user, show the richer
  // currentUser object instead — that one carries their own health record.
  const openDonorProfile = (donor: DonorProfile | null) => {
    if (donor && state.currentUser && donor.id === state.currentUser.id) {
      setSelectedProfileDonor(state.currentUser);
      return;
    }
    setSelectedProfileDonor(donor);
  };
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<EmergencyRequest | null>(null);
  const [markDonatedRequest, setMarkDonatedRequest] = useState<EmergencyRequest | null>(null);
  const [justPostedRequest, setJustPostedRequest] = useState<EmergencyRequest | null>(null);
  const [offeredRequestIds, setOfferedRequestIds] = useState<string[]>([]);
  const [pendingConfirmations, setPendingConfirmations] = useState<any[]>([]);

  // Keep state synced to localStorage
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const isLoggedIn = !!state.currentUser;
  const knownRequestIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedOnceRef = useRef(false);
  const { permission: notifyPermission, requestPermission: askNotifyPermission, notify } = useBrowserNotifications();

  // Pulls the current truth from Supabase and replaces local state with it.
  // Real data always wins — we never fall back to stale/local/demo data just
  // because a fresh fetch came back empty (an empty table means empty, not
  // "keep showing whatever was there before").
  const refreshSharedData = React.useCallback(async (loggedIn: boolean, userPoints: number | null) => {
    try {
      const shared = await fetchSharedData(loggedIn, userPoints);

      // Work out which requests are genuinely new since the last load, so a
      // donor with the tab in the background still gets alerted.
      const seen = knownRequestIdsRef.current;
      const isFirstLoad = !hasLoadedOnceRef.current;
      const newlySeen = isFirstLoad ? [] : shared.requests.filter(r => !seen.has(r.id));

      knownRequestIdsRef.current = new Set(shared.requests.map(r => r.id));
      hasLoadedOnceRef.current = true;

      newlySeen.forEach(r => {
        notify(
          `${r.bloodGroup} blood needed${r.urgency === 'Critical' ? ' — urgent' : ''}`,
          `${r.patientName} at ${r.hospitalName}. ${r.requiredBags} bag(s) needed.`,
          `request-${r.id}`
        );
      });

      setState(prev => ({
        ...prev,
        donors: shared.donors,
        requests: shared.requests,
        badges: shared.badges
      }));
    } catch (error) {
      console.error('Failed to fetch shared Supabase data:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notify]);

  // Restore Supabase auth session on startup, then load real data for that
  // login state (logged-in donors see full profiles; guests see the public view).
  useEffect(() => {
    async function restoreSessionAndLoad() {
      const donor = await getCurrentDonorFromSession();
      const activeDonor = recoveryModeRef.current ? null : donor;
      setState(prev => ({ ...prev, currentUser: activeDonor }));
      await refreshSharedData(!!activeDonor, activeDonor?.impactScore ?? null);
    }
    restoreSessionAndLoad();
  }, [refreshSharedData]);

  useEffect(() => subscribeToAuthState(
    donor => {
      // A password-reset link also creates a temporary session. Ignore the
      // generic sign-in callback while the recovery form is active.
      const activeDonor = recoveryModeRef.current ? null : donor;
      setState(prev => ({ ...prev, currentUser: activeDonor }));
      refreshSharedData(!!activeDonor, activeDonor?.impactScore ?? null);
    },
    () => {
      recoveryModeRef.current = true;
      setState(prev => ({ ...prev, currentUser: null }));
      refreshSharedData(false, null);
      setIsPasswordRecovery(true);
      if (window.location.hash.includes('type=recovery')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      setIsAuthModalOpen(true);
    }
  ), [refreshSharedData]);

  // Donation-loop data: which requests I've offered on, and which donations are
  // waiting for my confirmation.
  const refreshLoopData = React.useCallback(async (donorId: string | null | undefined) => {
    if (!donorId) {
      setOfferedRequestIds([]);
      setPendingConfirmations([]);
      return;
    }
    const [offered, pending] = await Promise.all([
      fetchMyOfferedRequestIds(donorId),
      fetchMyPendingConfirmations(donorId)
    ]);
    setOfferedRequestIds(offered);
    setPendingConfirmations(pending);
  }, []);

  useEffect(() => {
    refreshLoopData(state.currentUser?.id);
  }, [state.currentUser?.id, state.requests.length, refreshLoopData]);

  const handleOfferToDonate = async (req: EmergencyRequest) => {
    const { ok, error } = await offerToDonate(req.id);
    if (!ok) {
      window.alert(error || 'Could not send your offer.');
      return;
    }
    refreshLoopData(state.currentUser?.id);
  };

  // Live updates: instead of polling every 30s, subscribe to Postgres
  // changes on the tables that matter and refetch only when something
  // actually changes. Re-subscribes whenever login state changes so guests
  // read from the public view and signed-in donors read the full table.
  useEffect(() => {
    const unsubscribe = subscribeToLiveUpdates({
      onRequestsChange: () => refreshSharedData(isLoggedIn, state.currentUser?.impactScore ?? null),
      onDonorsChange: () => refreshSharedData(isLoggedIn, state.currentUser?.impactScore ?? null),
      onResponsesChange: () => refreshSharedData(isLoggedIn, state.currentUser?.impactScore ?? null)
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, state.currentUser?.id]);

  useEffect(() => {
    const donorId = state.currentUser?.id;
    if (!donorId) {
      setState(prev => ({ ...prev, notifications: [] }));
      return;
    }

    fetchMyNotifications(donorId).then(notifications => {
      setState(prev => ({ ...prev, notifications }));
    });

    return subscribeToNotifications(donorId, row => {
      const notification = mapDbNotificationToNotification(row);
      setState(prev => ({ ...prev, notifications: [notification, ...prev.notifications] }));
    });
  }, [state.currentUser?.id]);

  // Current User coordinates
  const currentLat = state.currentUser?.lat || 23.8103;
  const currentLng = state.currentUser?.lng || 90.4125;

  const filteredDonorsList = filterDonors(state.donors, filters, currentLat, currentLng);
  const unreadNotifsCount = state.notifications.filter(n => !n.read).length;

  /* Handlers */
  const handleAddNewRequest = async (reqData: Partial<EmergencyRequest>): Promise<boolean> => {
    if (!state.currentUser) {
      setIsRequestModalOpen(false);
      setIsAuthModalOpen(true);
      return false;
    }

    // Editing an existing request updates it in place; no new feed entry, no
    // duplicate notification.
    if (editingRequest) {
      const updated = await updateRequestInDb(editingRequest.id, reqData);
      if (!updated) return false;

      setState(prev => ({
        ...prev,
        requests: prev.requests.map(r => (r.id === updated.id ? updated : r))
      }));
      setEditingRequest(null);
      setIsRequestModalOpen(false);
      return true;
    }

    const savedReq = await createRequestInDb({ ...reqData, requesterId: state.currentUser.id });
    if (!savedReq) {
      return false;
    }

    setState(prev => ({
      ...prev,
      requests: [savedReq, ...prev.requests],
      notifications: [
        {
          id: `notif-${Date.now()}`,
          title: `Emergency request posted: ${savedReq.bloodGroup}`,
          message: `${savedReq.patientName} at ${savedReq.hospitalName}, ${savedReq.area}.`,
          type: 'emergency',
          time: 'Just now',
          read: false
        },
        ...prev.notifications
      ]
    }));
    setActiveTab('requests');
    setIsRequestModalOpen(false);

    // The single most useful moment to share: right after posting. Most blood in
    // Bangladesh is found through group forwards, so prompt immediately.
    setJustPostedRequest(savedReq);
    return true;
  };

  const handleLoginSuccess = (user: DonorProfile) => {
    setState(prev => ({ ...prev, currentUser: user }));
    refreshSharedData(true, user.impactScore ?? null);
  };

  const handleLogout = async () => {
    await signOutDonor();
    setIsPasswordRecovery(false);
    setState(prev => ({ ...prev, currentUser: null }));
    refreshSharedData(false, null);
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
    updateDonorAvailability(updatedUser.id, updatedUser.availableNow).then(persisted => {
      if (!persisted) {
        setState(prev => ({
          ...prev,
          currentUser: prev.currentUser?.id === updatedUser.id ? { ...prev.currentUser, availableNow: !updatedUser.availableNow } : prev.currentUser,
          donors: prev.donors.map(d => d.id === updatedUser.id ? { ...d, availableNow: !updatedUser.availableNow } : d)
        }));
        if (selectedProfileDonor?.id === updatedUser.id) {
          setSelectedProfileDonor(prev => prev ? { ...prev, availableNow: !updatedUser.availableNow } : prev);
        }
        window.alert('Availability could not be saved. Please try again.');
      }
    });
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
    if (state.currentUser) markMyNotificationsRead(state.currentUser.id);
  };

  return (
    <div className="min-h-screen overflow-x-hidden flex flex-col bg-slate-100/60 font-sans text-slate-900 selection:bg-rose-500 selection:text-white antialiased">
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
          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-5 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-700">
              Signed in as <span className="font-bold text-slate-900">{state.currentUser.name}</span>
            </p>
            <button
              onClick={() => { setEditingRequest(null); setIsRequestModalOpen(true); }}
              className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Request blood
            </button>
          </div>
        ) : (
          /* Guests get one sentence and one action. The old panel had three
             cards that carried no information and could not be acted on. */
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Find blood donors across Bangladesh. Sign in to post a request or offer to donate.
            </p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="shrink-0 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Sign in
            </button>
          </div>
        )}
      </div>

      {/* Main Structural Frame */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] lg:min-h-[calc(100vh-5rem)]">
        {/* Left Smart Filter & Impact Sidebar */}
        <SidebarStats
          currentUser={state.currentUser}
          filters={filters}
          setFilters={setFilters}
          onSearch={() => setActiveTab('network')}
          donorsCount={filteredDonorsList.length}
        />

        {/* Right Active Workspace Container */}
        <div className="flex-1 min-w-0 lg:overflow-hidden lg:h-full flex flex-col bg-white">
          {activeTab === 'network' && (
            <DonorsNetwork
              donors={filteredDonorsList}
              filters={filters}
              onSelectDonor={d => openDonorProfile(d)}
              onRequestBlood={() => setIsRequestModalOpen(true)}
            />
          )}

          {activeTab === 'requests' && (
            <>
            {isLoggedIn && notifyPermission === 'default' && (
              <div className="mx-6 lg:mx-10 mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Get alerted on screen when someone nearby needs your blood type.
                </p>
                <button
                  onClick={askNotifyPermission}
                  className="shrink-0 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  Turn on alerts
                </button>
              </div>
            )}
            <div className="px-6 lg:px-10 pt-6">
              <ConfirmDonationBanner
                pending={pendingConfirmations}
                onConfirmed={async () => {
                  const donor = await getCurrentDonorFromSession();
                  setState(prev => ({ ...prev, currentUser: donor }));
                  refreshSharedData(true, donor?.impactScore ?? null);
                  refreshLoopData(donor?.id);
                }}
              />
            </div>
            <EmergencyFeed
              requests={state.requests}
              currentDonorId={state.currentUser?.id || null}
              offeredRequestIds={offeredRequestIds}
              onOfferToDonate={handleOfferToDonate}
              onMarkDonated={req => setMarkDonatedRequest(req)}
              onEditRequest={req => { setEditingRequest(req); setIsRequestModalOpen(true); }}
              onSelectRequest={() => setActiveTab('requests')}
              onRequestBlood={() => { setEditingRequest(null); setIsRequestModalOpen(true); }}
            />
            </>
          )}

          {activeTab === 'map' && (
            <DonorsNetwork
              donors={filteredDonorsList}
              filters={filters}
              onSelectDonor={d => openDonorProfile(d)}
              onRequestBlood={() => setIsRequestModalOpen(true)}
              initialViewMode="map"
            />
          )}

          {activeTab === 'rewards' && (
            <RewardsHub
              currentUser={state.currentUser}
              badges={state.badges}
              leaderboard={[...state.donors].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0)).slice(0, 8)}
            />
          )}

          {activeTab === 'hospital' && (
            <HospitalPortal
              requests={state.requests}
              currentUser={state.currentUser}
              onDataChanged={() => refreshSharedData(isLoggedIn, state.currentUser?.impactScore ?? null)}
              onRequestBlood={() => { setEditingRequest(null); setIsRequestModalOpen(true); }}
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

      <Footer />

      {/* Dialog Modals Overlay */}
      <ShareRequestModal
        request={justPostedRequest}
        isOpen={!!justPostedRequest}
        onClose={() => setJustPostedRequest(null)}
      />

      <MarkDonatedModal
        request={markDonatedRequest}
        isOpen={!!markDonatedRequest}
        allDonors={state.donors}
        onClose={() => setMarkDonatedRequest(null)}
        onRecorded={() => {
          refreshSharedData(isLoggedIn, state.currentUser?.impactScore ?? null);
          refreshLoopData(state.currentUser?.id);
        }}
      />

      <RequestBloodModal
        isOpen={isRequestModalOpen}
        editingRequest={editingRequest}
        onClose={() => { setIsRequestModalOpen(false); setEditingRequest(null); }}
        onSubmit={handleAddNewRequest}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        passwordRecovery={isPasswordRecovery}
        onPasswordRecoveryComplete={() => {
          recoveryModeRef.current = false;
          setIsPasswordRecovery(false);
        }}
      />

      <ProfileModal
        donor={selectedProfileDonor}
        isOwnProfile={selectedProfileDonor?.id === state.currentUser?.id}
        onClose={() => setSelectedProfileDonor(null)}
        onToggleAvailability={selectedProfileDonor?.id === state.currentUser?.id ? handleToggleCurrentUserAvailability : undefined}
        onProfileUpdated={selectedProfileDonor?.id === state.currentUser?.id ? (updated) => {
          setState(prev => ({
            ...prev,
            currentUser: prev.currentUser?.id === updated.id ? updated : prev.currentUser,
            donors: prev.donors.map(d => d.id === updated.id ? updated : d)
          }));
          setSelectedProfileDonor(updated);
        } : undefined}
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
