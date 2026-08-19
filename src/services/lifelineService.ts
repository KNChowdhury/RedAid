import { supabase } from './supabaseClient';
import type { Session, RealtimeChannel } from '@supabase/supabase-js';
import { BANGLADESH_DISTRICTS } from '../mockData';
import { BloodGroup, DonorProfile, EmergencyRequest, NotificationItem, RewardBadge, SearchFilters } from '../types';

// V3: bumped on purpose. Earlier versions of this app seeded localStorage with
// demo/sample donors, requests and notifications. Changing this key forces
// every existing browser to drop that cached demo data on next load instead
// of showing it forever alongside real Supabase data.
const STORAGE_KEY = 'LIFELINE_BD_STATE_V3';

export interface AppState {
  donors: DonorProfile[];
  requests: EmergencyRequest[];
  badges: RewardBadge[];
  currentUser: DonorProfile | null;
  notifications: NotificationItem[];
  token: string | null;
}

// Calculate Haversine distance between two lat/lng coordinates
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Load or initialize state
export function getAppState(): AppState {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed;
    } catch {
      // Fallback if corrupt
    }
  }

  // Fresh state: everything starts empty and is filled in from Supabase.
  // No sample/demo donors, requests or notifications are seeded here anymore —
  // showing fake data alongside real data was confusing and looked unfinished.
  const newState: AppState = {
    donors: [],
    requests: [],
    badges: [],
    currentUser: null,
    notifications: [],
    token: null
  };

  saveAppState(newState);
  return newState;
}

export function saveAppState(state: AppState) {
  const safeState = {
    donors: state.donors.map(({ email, phone, whatsapp, healthInfo, ...donor }) => donor),
    requests: state.requests.map(({ contactPhone, contactWhatsapp, ...request }) => request),
    badges: state.badges,
    currentUser: null,
    notifications: [],
    token: null
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
}

export function normalizeWhatsAppNumber(value: string | null | undefined): string | null {
  const digits = (value || '').replace(/\D/g, '').replace(/^00/, '');
  const international = digits.startsWith('0') ? `88${digits}` : digits;
  return /^8801[3-9]\d{8}$/.test(international) ? international : null;
}

export function getWhatsAppUrl(value: string | null | undefined, message?: string): string | null {
  const number = normalizeWhatsAppNumber(value);
  if (!number) return null;
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

// Filter Donors Logic
export function filterDonors(donors: DonorProfile[], filters: SearchFilters, currentLat: number, currentLng: number): DonorProfile[] {
  return donors.filter(donor => {
    // Blood group match
    if (filters.bloodGroup && filters.bloodGroup !== 'ALL' && donor.bloodGroup !== filters.bloodGroup) {
      return false;
    }
    // District match
    if (filters.district && filters.district !== 'ALL' && donor.district !== filters.district) {
      return false;
    }
    // Area match
    if (filters.area && filters.area !== 'ALL' && donor.area !== filters.area) {
      return false;
    }
    // Verified
    if (filters.verifiedOnly && !donor.isVerified) {
      return false;
    }
    // Non smoker
    if (filters.nonSmokerOnly && donor.isSmoker) {
      return false;
    }
    // Regular
    if (filters.regularOnly && !donor.isRegular) {
      return false;
    }
    // Available now
    if (filters.availableNowOnly && !donor.availableNow) {
      return false;
    }
    // Distance filter
    if (filters.maxDistanceKm > 0 && currentLat && currentLng && donor.lat && donor.lng) {
      const dist = calculateDistanceKm(currentLat, currentLng, donor.lat, donor.lng);
      if (dist > filters.maxDistanceKm) {
        return false;
      }
    }
    return true;
  });
}

// Check compatible blood groups
export function getCompatibleDonorGroups(recipientGroup: BloodGroup): BloodGroup[] {
  switch (recipientGroup) {
    case 'AB+': return ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    case 'AB-': return ['AB-', 'A-', 'B-', 'O-'];
    case 'A+': return ['A+', 'A-', 'O+', 'O-'];
    case 'A-': return ['A-', 'O-'];
    case 'B+': return ['B+', 'B-', 'O+', 'O-'];
    case 'B-': return ['B-', 'O-'];
    case 'O+': return ['O+', 'O-'];
    case 'O-': return ['O-'];
  }
}

// Simulate Gemini AI Assistant
export async function askGeminiAssistant(prompt: string, userContext: DonorProfile | null): Promise<string> {
  // Graceful fallback AI response
  const lower = prompt.toLowerCase();
  if (lower.includes('appeal') || lower.includes('message') || lower.includes('whatsapp') || lower.includes('draft')) {
    return `🚨 **URGENT BLOOD REQUEST** 🚨
**Patient:** Emergency Casualty
**Requirement:** 2 Bags of **${userContext?.bloodGroup || 'O-'}** Blood
**Location:** Dhaka Medical / United Hospital
**Contact:** ${userContext?.phone || '+880 1711-000000'}

*Every drop saves a life. Please share or contact immediately if available!* #LifelineBD #BloodDonation`;
  }
  if (lower.includes('food') || lower.includes('diet') || lower.includes('iron') || lower.includes('eat')) {
    return `🥗 **Nutrition Tips for Donors in Bangladesh:**
1. **Iron-Rich Greens:** Increase intake of *Kochu Shak* (colocasia leaves), red spinach (*Lal Shak*), and lentils (*Dal*).
2. **Vitamin C Boost:** Drink fresh *Lemon water* or *Amra* with your iron-rich meals to enhance absorption dramatically.
3. **Hydration & Rest:** Drink at least 3-4 glasses of water or coconut water immediately after donating and avoid heavy lifting for 24 hours.`;
  }
  return `🩸 **LifelineBD Smart Health Advisor:**
As a registered donor (${userContext?.bloodGroup || 'B+'}), your safety and recovery are our top priority.
- Standard waiting interval is **120 days** (approx. 4 months) between whole blood donations.
- Ensure hemoglobin is above **12.5 g/dL** and BP is stable.
- If you received any recent vaccination or antibiotics, defer donation for 14 days.`;
}

// Find coordinates for area/district
export function lookupCoordinates(district: string, area: string): { lat: number; lng: number } {
  const distObj = BANGLADESH_DISTRICTS.find(d => d.name === district);
  if (!distObj) return { lat: 23.8103, lng: 90.4125 }; // Dhaka default
  // Add small random offset for area variation
  const areaIndex = distObj.areas.indexOf(area);
  const offsetLat = (areaIndex > -1 ? areaIndex - 4 : 0) * 0.008;
  const offsetLng = (areaIndex > -1 ? 4 - areaIndex : 0) * 0.008;
  return {
    lat: Math.round((distObj.lat + offsetLat) * 10000) / 10000,
    lng: Math.round((distObj.lng + offsetLng) * 10000) / 10000
  };
}
// ============ SUPABASE: Map database rows to app types ============

function mapDbDonorToProfile(row: any): DonorProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone,
    whatsapp: row.whatsapp || '',
    avatar: row.avatar || getDicebearAvatarUrl(row.name || row.email || row.auth_user_id),
    role: row.role,
    bloodGroup: row.blood_group,
    district: row.district || '',
    area: row.area || '',
    lat: row.lat || 0,
    lng: row.lng || 0,
    lastDonationDate: row.last_donation_date || '',
    nextEligibleDate: row.next_eligible_date || '',
    isSmoker: row.is_smoker,
    isRegular: row.is_regular,
    isVerified: row.is_verified,
    availableNow: row.available_now,
    healthInfo: {
      weightKg: row.weight_kg || 0,
      bloodPressure: row.blood_pressure || '',
      hemoglobin: row.hemoglobin || 0,
      hasChronicDisease: row.has_chronic_disease,
      recentMedication: row.recent_medication || '',
      hbsagStatus: row.hbsag_status || 'Not Tested',
      hcvStatus: row.hcv_status || 'Not Tested',
      hivStatus: row.hiv_status || 'Not Tested',
      syphilisStatus: row.syphilis_status || 'Not Tested',
      malariaStatus: row.malaria_status || 'Not Tested',
      healthMetrics: {
        hbsag: row.hbsag_status || 'Not Tested',
        anti_hcv: row.hcv_status || 'Not Tested',
        anti_hiv: row.hiv_status || 'Not Tested',
        vdrl: row.syphilis_status || 'Not Tested',
        mp: row.malaria_status || 'Not Tested'
      }
    },
    impactScore: row.impact_score,
    livesSaved: row.lives_saved,
    badges: [],
    donationsHistory: []
  };
}

function getDicebearAvatarUrl(seed?: string) {
  const s = encodeURIComponent(seed || 'user');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`;
}

export async function updateDonorProfile(
  donorId: string,
  updates: Partial<{
    name: string;
    phone: string;
    whatsapp: string;
    bloodGroup: BloodGroup;
    avatar: string;
    district: string;
    area: string;
    hbsagStatus: string;
    hcvStatus: string;
    hivStatus: string;
    syphilisStatus: string;
    malariaStatus: string;
    antiHcvStatus: string;
    antiHivStatus: string;
    vdrlStatus: string;
    mpStatus: string;
  }>
): Promise<DonorProfile | null> {
  const supabaseClient = supabase;
  if (!supabaseClient) {
    console.error('Supabase client not configured.');
    return null;
  }

  const { lat, lng } = updates.district && updates.area
    ? lookupCoordinates(updates.district, updates.area)
    : { lat: undefined, lng: undefined };

  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
  if (updates.bloodGroup !== undefined) dbUpdates.blood_group = updates.bloodGroup;
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
  if (updates.district !== undefined) dbUpdates.district = updates.district;
  if (updates.area !== undefined) dbUpdates.area = updates.area;
  if (lat !== undefined) dbUpdates.lat = lat;
  if (lng !== undefined) dbUpdates.lng = lng;

  const healthUpdates: Record<string, string> = {};
  if (updates.hbsagStatus !== undefined) healthUpdates.hbsag_status = updates.hbsagStatus;
  if (updates.hcvStatus !== undefined || updates.antiHcvStatus !== undefined) healthUpdates.hcv_status = updates.hcvStatus || updates.antiHcvStatus || 'Not Tested';
  if (updates.hivStatus !== undefined || updates.antiHivStatus !== undefined) healthUpdates.hiv_status = updates.hivStatus || updates.antiHivStatus || 'Not Tested';
  if (updates.syphilisStatus !== undefined || updates.vdrlStatus !== undefined) healthUpdates.syphilis_status = updates.syphilisStatus || updates.vdrlStatus || 'Not Tested';
  if (updates.malariaStatus !== undefined || updates.mpStatus !== undefined) healthUpdates.malaria_status = updates.malariaStatus || updates.mpStatus || 'Not Tested';

  if (Object.keys(healthUpdates).length > 0) {
    const { error: healthError } = await supabaseClient
      .from('donor_health')
      .upsert({ donor_id: donorId, ...healthUpdates }, { onConflict: 'donor_id' });
    if (healthError) console.error('Update donor health error:', healthError);
  }

  if (Object.keys(dbUpdates).length === 0) {
    const reloaded = await supabaseClient.from('donors').select('*').eq('id', donorId).maybeSingle();
    if (!reloaded.data) return null;
    const profile = mapDbDonorToProfile(reloaded.data);
    profile.healthInfo = { ...(profile.healthInfo || {}), ...(await fetchMyHealthInfo(donorId)) } as any;
    return profile;
  }

  const { data, error } = await supabaseClient
    .from('donors')
    .update(dbUpdates)
    .eq('id', donorId)
    .select()
    .single();

  if (error || !data) {
    console.error('Update donor error:', error);
    return null;
  }
  const profile = mapDbDonorToProfile(data);
  profile.healthInfo = { ...(profile.healthInfo || {}), ...(await fetchMyHealthInfo(donorId)) } as any;
  return profile;
}

export async function fetchMyHealthInfo(donorId: string): Promise<Record<string, any>> {
  if (!supabase) return {};

  const { data, error } = await supabase
    .from('donor_health')
    .select('*')
    .eq('donor_id', donorId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Fetch health info error:', error.message);
    return {};
  }

  return {
    weightKg: data.weight_kg ?? 0,
    bloodPressure: data.blood_pressure || '',
    hemoglobin: data.hemoglobin ?? 0,
    hasChronicDisease: !!data.has_chronic_disease,
    recentMedication: data.recent_medication || '',
    hbsagStatus: data.hbsag_status || 'Not Tested',
    hcvStatus: data.hcv_status || 'Not Tested',
    hivStatus: data.hiv_status || 'Not Tested',
    syphilisStatus: data.syphilis_status || 'Not Tested',
    malariaStatus: data.malaria_status || 'Not Tested'
  };
}

export async function updateDonorAvailability(donorId: string, availableNow: boolean): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('donors').update({ available_now: availableNow }).eq('id', donorId);
  if (error) {
    console.error('Update donor availability error:', error.message);
    return false;
  }
  return true;
}

export async function toggleDonorVerification(donorId: string, isVerified: boolean): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase client not configured.');
    return false;
  }

  const { error } = await supabase
    .from('donors')
    .update({ is_verified: isVerified })
    .eq('id', donorId);

  if (error) {
    console.error('Toggle verification error:', error);
    return false;
  }
  return true;
}

export async function deleteRequestFromDb(requestId: string): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase client not configured.');
    return false;
  }

  const { error } = await supabase
    .from('requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error('Delete request error:', error);
    return false;
  }
  return true;
}

function mapDbRequestToRequest(row: any): EmergencyRequest {
  return {
    id: row.id,
    patientName: row.patient_name,
    age: row.age || 0,
    bloodGroup: row.blood_group,
    hospitalName: row.hospital_name,
    district: row.district || '',
    area: row.area || '',
    requiredBags: row.required_bags,
    neededByTime: row.needed_by_time || '',
    urgency: row.urgency,
    contactPhone: row.contact_phone,
    contactWhatsapp: row.contact_whatsapp || '',
    reason: row.reason || '',
    status: row.status,
    createdAt: row.created_at,
    requesterId: row.requester_id || '',
    matchedDonorsCount: row.matched_donors_count
  };
}

export function mapDbNotificationToNotification(row: any): NotificationItem {
  return {
    id: row.id,
    title: row.title || 'LifelineBD notification',
    message: row.message || '',
    type: row.type || 'system',
    time: row.created_at ? new Date(row.created_at).toLocaleString() : 'Just now',
    read: !!row.read,
    relatedBloodGroup: row.related_blood_group || undefined,
    relatedRequestId: row.related_request_id || undefined
  };
}

export async function fetchMyNotifications(donorId: string): Promise<NotificationItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('donor_id', donorId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Fetch notifications error:', error.message);
    return [];
  }
  return (data || []).map(mapDbNotificationToNotification);
}

export async function markMyNotificationsRead(donorId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('donor_id', donorId)
    .eq('read', false);
  if (error) {
    console.error('Mark notifications read error:', error.message);
    return false;
  }
  return true;
}

function buildDonorInsertPayload(user: any): Record<string, any> {
  const nameFromMetadata = user?.user_metadata?.full_name || user?.user_metadata?.name;
  const defaultName = nameFromMetadata || user?.email?.split('@')[0] || 'Lifeline Donor';
  return {
    auth_user_id: user.id,
    name: defaultName,
    email: user.email || '',
    phone: '',
    whatsapp: '',
    role: 'donor',
    blood_group: 'O+',
    district: '',
    area: '',
    lat: 23.8103,
    lng: 90.4125,
    last_donation_date: null,
    next_eligible_date: null,
    is_smoker: false,
    is_regular: false,
    is_verified: false,
    available_now: false,
    avatar: getDicebearAvatarUrl(defaultName),
    impact_score: 0,
    lives_saved: 0
  };
}

function mapDbBadgeToBadge(row: any, currentUserPoints: number | null): RewardBadge {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || '',
    description: row.description || '',
    pointsRequired: row.points_required,
    // A badge is "achieved" once the signed-in donor's real impact score
    // reaches its threshold. Guests (currentUserPoints === null) never see
    // badges as achieved.
    achieved: currentUserPoints !== null && currentUserPoints >= row.points_required,
    category: row.category
  };
}

// ============ SUPABASE: Fetch real shared data ============
// isLoggedIn controls which donors source we read from:
//  - logged in  -> 'donors' table (full profile, protected by RLS to authenticated users)
//  - guest      -> 'v_public_donors' view (name/blood group/location only, no phone or health data)
// currentUserPoints is used only to compute which badges are achieved.
export async function fetchSharedData(
  isLoggedIn: boolean,
  currentUserPoints: number | null = null
): Promise<{
  donors: DonorProfile[];
  requests: EmergencyRequest[];
  badges: RewardBadge[];
}> {
  if (!supabase) {
    return { donors: [], requests: [], badges: [] };
  }

  const donorsQuery = isLoggedIn
    ? supabase.from('v_donors_directory').select('*')
    : supabase.from('v_public_donors').select('*');

  const [donorsRes, requestsRes, badgesRes] = await Promise.all([
    donorsQuery,
    supabase.from('requests').select('*').order('created_at', { ascending: false }),
    supabase.from('badges').select('*')
  ]);

  if (donorsRes.error) console.error('Supabase donors fetch error:', donorsRes.error);
  if (requestsRes.error) console.error('Supabase requests fetch error:', requestsRes.error);
  if (badgesRes.error) console.error('Supabase badges fetch error:', badgesRes.error);

  return {
    donors: (donorsRes.data || []).map(mapDbDonorToProfile),
    requests: (requestsRes.data || []).map(mapDbRequestToRequest),
    badges: (badgesRes.data || []).map((row: any) => mapDbBadgeToBadge(row, currentUserPoints))
  };
}

// ============ SUPABASE: Realtime ============
// Subscribes to live changes on the tables that power the emergency feed and
// donor network, so the UI updates the instant someone else posts a request,
// registers, or responds — no polling, no manual refresh.
// Returns an unsubscribe function; call it in a useEffect cleanup.
export function subscribeToLiveUpdates(handlers: {
  onRequestsChange?: () => void;
  onDonorsChange?: () => void;
  onResponsesChange?: () => void;
}): () => void {
  if (!supabase) {
    return () => {};
  }

  const channel: RealtimeChannel = supabase
    .channel('lifelinebd-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
      handlers.onRequestsChange?.();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'donors' }, () => {
      handlers.onDonorsChange?.();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'request_responses' }, () => {
      handlers.onResponsesChange?.();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Subscribes a signed-in donor to their own notification rows in real time.
export function subscribeToNotifications(
  donorId: string,
  onInsert: (row: any) => void
): () => void {
  if (!supabase) {
    return () => {};
  }

  const channel: RealtimeChannel = supabase
    .channel(`lifelinebd-notifications-${donorId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `donor_id=eq.${donorId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function sendPasswordResetEmail(email: string): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Supabase client not configured.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Supabase client not configured.' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
    }
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function signUpDonor(profile: {
  name: string;
  email: string;
  password: string;
  phone: string;
  bloodGroup: string;
  district: string;
  area: string;
  isSmoker: boolean;
}): Promise<{ user: DonorProfile | null; error: string | null }> {
  if (!supabase) {
    return { user: null, error: 'Supabase client not configured.' };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: profile.email,
    password: profile.password
  });

  const signedUpUser = signUpData?.user || signUpData?.session?.user;
  const signUpErrorMessage = signUpError?.message || '';
  const isDuplicateEmailError = /already registered|duplicate|user already exists|email.*already/i.test(signUpErrorMessage);

  if (signUpError || !signedUpUser) {
    if (isDuplicateEmailError) {
      const { user, error: signInError } = await signInDonor(profile.email, profile.password);
      if (signInError || !user) {
        if (signInError?.toLowerCase().includes('invalid') || signInError?.toLowerCase().includes('wrong')) {
          return {
            user: null,
            error: 'Email already registered. Please sign in with your password or reset it if you forgot.'
          };
        }
        return {
          user: null,
          error: signInError || 'Email already registered. Please sign in instead.'
        };
      }
      return { user, error: null };
    }

    const lowerMessage = signUpErrorMessage.toLowerCase();
    const friendlyMessage = lowerMessage.includes('rate limit')
      ? 'Email rate limit exceeded. Please wait a few minutes before trying again.'
      : signUpErrorMessage || 'Signup failed. Check your email and password.';
    return { user: null, error: friendlyMessage };
  }

  let session: Session | null = signUpData?.session ?? null;
  if (session?.access_token && session?.refresh_token) {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  }

  if (!session) {
    const sessionRes = await supabase.auth.getSession();
    session = sessionRes.data?.session ?? null;
  }

  if (!session || !session.user) {
    return {
      user: null,
      error: 'Registration received. Please check your email for a confirmation link before signing in.'
    };
  }

  const currentUser = session.user;
  const userId = currentUser.id;
  const { data: donorData, error: donorError } = await supabase
    .from('donors')
    .insert({
      auth_user_id: userId,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      whatsapp: profile.phone,
      role: 'donor',
      blood_group: profile.bloodGroup,
      district: profile.district,
      area: profile.area,
      lat: 23.8103,
      lng: 90.4125,
      last_donation_date: null,
      next_eligible_date: null,
      is_smoker: profile.isSmoker,
      is_regular: false,
      is_verified: false,
      available_now: true,
      weight_kg: 0,
      blood_pressure: '',
      hemoglobin: 0,
      has_chronic_disease: false,
      recent_medication: '',
      impact_score: 0,
      lives_saved: 0
    })
    .select()
    .single();

  if (donorError || !donorData) {
    console.error('Supabase donor profile create error:', donorError);
    const rlsMessage = donorError?.message?.toLowerCase().includes('row-level security')
      ? 'Donor profile creation blocked by row-level security. Ensure your Supabase donors policy allows inserts for authenticated users with auth.uid() = id.'
      : donorError?.message || 'Donor profile creation failed.';
    return { user: null, error: rlsMessage };
  }

  const signedUpProfile = mapDbDonorToProfile(donorData);
  signedUpProfile.healthInfo = { ...(signedUpProfile.healthInfo || {}), ...(await fetchMyHealthInfo(signedUpProfile.id)) } as any;
  return { user: signedUpProfile, error: null };
}

export async function signInDonor(email: string, password: string): Promise<{ user: DonorProfile | null; error: string | null }> {
  if (!supabase) {
    return { user: null, error: 'Supabase client not configured.' };
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData?.user) {
    return { user: null, error: authError?.message || 'Invalid email or password.' };
  }

  if (authData.session?.access_token && authData.session?.refresh_token) {
    await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    });
  }

  const currentUser = authData.user || (await supabase.auth.getUser()).data.user;
  if (!currentUser) {
    return { user: null, error: 'Unable to resolve authenticated user after sign in.' };
  }

  const sessionCheck = await supabase.auth.getSession();
  if (!sessionCheck.data?.session?.user || sessionCheck.data.session.user.id !== currentUser.id) {
    return { user: null, error: 'Authenticated session is not active. Please refresh and sign in again.' };
  }

  const userId = currentUser.id;
  let donorRes = await supabase.from('donors').select('*').eq('auth_user_id', userId).maybeSingle();
  if ((!donorRes.data || donorRes.error) && authData.user.email) {
    donorRes = await supabase.from('donors').select('*').eq('email', authData.user.email).maybeSingle();
  }

  if (donorRes.error || !donorRes.data) {
    if (donorRes.error) {
      console.error('Supabase donor lookup error:', donorRes.error);
    }

    const fallbackPayload = buildDonorInsertPayload(authData.user);
    const { data: insertedDonor, error: insertError } = await supabase
      .from('donors')
      .insert(fallbackPayload)
      .select()
      .single();

    if (insertError || !insertedDonor) {
      console.error('Supabase donor profile fallback insert error:', insertError);
      const rlsMessage = insertError?.message?.toLowerCase().includes('row-level security')
        ? 'Authenticated user cannot create donor rows under current RLS rules. Verify donors insert policy allows auth.uid() = id.'
        : insertError?.message || 'Your account is authenticated, but your donor profile could not be created.';
      return { user: null, error: rlsMessage };
    }

    const insertedProfile = mapDbDonorToProfile(insertedDonor);
    insertedProfile.healthInfo = { ...(insertedProfile.healthInfo || {}), ...(await fetchMyHealthInfo(insertedProfile.id)) } as any;
    return { user: insertedProfile, error: null };
  }

  const signedInProfile = mapDbDonorToProfile(donorRes.data);
  signedInProfile.healthInfo = { ...(signedInProfile.healthInfo || {}), ...(await fetchMyHealthInfo(signedInProfile.id)) } as any;
  return { user: signedInProfile, error: null };
}

export async function getCurrentDonorFromSession(): Promise<DonorProfile | null> {
  if (!supabase) {
    return null;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.user) {
    if (sessionError) console.error('Supabase session restore error:', sessionError.message);
    return null;
  }

  const user = sessionData.session.user;
  let donorRes = await supabase.from('donors').select('*').eq('auth_user_id', user.id).maybeSingle();
  if ((!donorRes.data || donorRes.error) && user.email) {
    donorRes = await supabase.from('donors').select('*').eq('email', user.email).maybeSingle();
  }

  if (donorRes.error || !donorRes.data) {
    if (donorRes.error) console.error('Supabase donor restore error:', donorRes.error.message);
    return null;
  }

  const restored = mapDbDonorToProfile(donorRes.data);
  restored.healthInfo = { ...(restored.healthInfo || {}), ...(await fetchMyHealthInfo(restored.id)) } as any;
  return restored;
}

export async function signOutDonor(): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Supabase sign out error:', error.message);
  }
}

// Upload avatar image to Supabase Storage and return public URL
export async function uploadAvatar(file: File, userId: string): Promise<string | null> {
  if (!supabase) {
    console.error('Supabase client not configured.');
    return null;
  }

  try {
    const bucket = 'avatars';
    const filename = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const { data, error } = await supabase.storage.from(bucket).upload(filename, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream'
    });
    if (error) {
      console.error('Supabase storage upload error:', error);
      return null;
    }

    // Try to get public URL; if that fails, build a fallback public URL
    try {
      const urlRes = await supabase.storage.from(bucket).getPublicUrl(data.path);
      const urlData = (urlRes as any)?.data;
      if (urlData?.publicUrl) return urlData.publicUrl;
    } catch (e) {
      // continue to fallback
    }

    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    if (supabaseUrl) {
      return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${encodeURI(data.path)}`;
    }
    return null;
  } catch (err) {
    console.error('Avatar upload failed', err);
    return null;
  }
}

// ============ SUPABASE: Create a new emergency request ============
export async function createRequestInDb(reqData: Partial<EmergencyRequest>): Promise<EmergencyRequest | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('requests')
    .insert({
      patient_name: reqData.patientName,
      age: reqData.age,
      blood_group: reqData.bloodGroup,
      hospital_name: reqData.hospitalName,
      district: reqData.district,
      area: reqData.area,
      required_bags: reqData.requiredBags,
      needed_by_time: reqData.neededByTime,
      urgency: reqData.urgency,
      contact_phone: reqData.contactPhone,
      contact_whatsapp: reqData.contactWhatsapp,
      reason: reqData.reason,
      requester_id: reqData.requesterId,
      status: 'Pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase create request error:', error);
    return null;
  }
  return mapDbRequestToRequest(data);
}
