import { supabase } from './supabaseClient';
import type { Session, RealtimeChannel } from '@supabase/supabase-js';
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

// Age is derived, never stored raw, so it never goes stale year over year.
export function calculateAge(birthYear: number | null | undefined): number | null {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
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

/**
 * A ready-to-forward WhatsApp message for an emergency request.
 *
 * This needs no API, no business verification and costs nothing: it opens
 * WhatsApp with the text pre-filled, and the person chooses which groups or
 * contacts to send it to. In Bangladesh most blood is found through group
 * forwards, so this simply makes what people already do much faster.
 */
export function buildRequestShareText(req: {
  bloodGroup: string;
  requiredBags: number;
  patientName: string;
  age?: number;
  hospitalName: string;
  area?: string;
  district?: string;
  neededByTime?: string;
  urgency?: string;
  contactPhone?: string;
}): string {
  const place = [req.area, req.district].filter(Boolean).join(', ');
  const lines = [
    `🩸 ${req.bloodGroup} রক্ত প্রয়োজন — ${req.requiredBags} ব্যাগ`,
    '',
    `রোগী: ${req.patientName}${req.age ? ` (${req.age} বছর)` : ''}`,
    `হাসপাতাল: ${req.hospitalName}${place ? `, ${place}` : ''}`,
    req.neededByTime ? `সময়: ${req.neededByTime}` : '',
    req.urgency === 'Critical' ? '⚠️ অতি জরুরি' : '',
    req.contactPhone ? `যোগাযোগ: ${req.contactPhone}` : '',
    '',
    'আপনার পরিচিত কেউ দিতে পারলে দয়া করে জানান।',
    'বিস্তারিত ও অন্যান্য অনুরোধ: https://lifelinebd.vercel.app'
  ];
  return lines.filter(l => l !== '').join('\n');
}

/** wa.me link with no recipient, so WhatsApp asks the sender who to forward to. */
export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
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

// Every district's division, so a donor anywhere in Bangladesh gets a map
// point near their own region instead of always defaulting to Dhaka. Source:
// bangladesh.gov.bd's official upazila list (same data behind patch_12).
const DISTRICT_TO_DIVISION: Record<string, string> = {
  'Dhaka': 'Dhaka',
  'Faridpur': 'Dhaka',
  'Gazipur': 'Dhaka',
  'Gopalganj': 'Dhaka',
  'Kishoreganj': 'Dhaka',
  'Madaripur': 'Dhaka',
  'Manikganj': 'Dhaka',
  'Munshiganj': 'Dhaka',
  'Narayanganj': 'Dhaka',
  'Narsingdi': 'Dhaka',
  'Rajbari': 'Dhaka',
  'Shariatpur': 'Dhaka',
  'Tangail': 'Dhaka',
  'Bagerhat': 'Khulna',
  'Chuadanga': 'Khulna',
  'Jashore': 'Khulna',
  'Jhenaidah': 'Khulna',
  'Khulna': 'Khulna',
  'Kushtia': 'Khulna',
  'Magura': 'Khulna',
  'Meherpur': 'Khulna',
  'Narail': 'Khulna',
  'Satkhira': 'Khulna',
  'Bandarban': 'Chattogram',
  'Brahmanbaria': 'Chattogram',
  'Chandpur': 'Chattogram',
  'Chattogram': 'Chattogram',
  'Cumilla': 'Chattogram',
  "Cox's Bazar": 'Chattogram',
  'Feni': 'Chattogram',
  'Khagrachhari': 'Chattogram',
  'Lakshmipur': 'Chattogram',
  'Noakhali': 'Chattogram',
  'Rangamati': 'Chattogram',
  'Bogra': 'Rajshahi',
  'Joypurhat': 'Rajshahi',
  'Naogaon': 'Rajshahi',
  'Natore': 'Rajshahi',
  'Chapainawabganj': 'Rajshahi',
  'Pabna': 'Rajshahi',
  'Rajshahi': 'Rajshahi',
  'Sirajganj': 'Rajshahi',
  'Habiganj': 'Sylhet',
  'Moulvibazar': 'Sylhet',
  'Sunamganj': 'Sylhet',
  'Sylhet': 'Sylhet',
  'Dinajpur': 'Rangpur',
  'Gaibandha': 'Rangpur',
  'Kurigram': 'Rangpur',
  'Lalmonirhat': 'Rangpur',
  'Nilphamari': 'Rangpur',
  'Panchagarh': 'Rangpur',
  'Rangpur': 'Rangpur',
  'Thakurgaon': 'Rangpur',
  'Jamalpur': 'Mymensingh',
  'Mymensingh': 'Mymensingh',
  'Netrokona': 'Mymensingh',
  'Sherpur': 'Mymensingh',
  'Barguna': 'Barishal',
  'Barishal': 'Barishal',
  'Bhola': 'Barishal',
  'Jhalakathi': 'Barishal',
  'Patuakhali': 'Barishal',
  'Pirojpur': 'Barishal'
};

const DIVISION_CENTERS: Record<string, { lat: number; lng: number }> = {
  Dhaka: { lat: 23.8103, lng: 90.4125 },
  Chattogram: { lat: 22.3569, lng: 91.7832 },
  Sylhet: { lat: 24.8949, lng: 91.8687 },
  Rajshahi: { lat: 24.3745, lng: 88.6042 },
  Khulna: { lat: 22.8456, lng: 89.5403 },
  Barishal: { lat: 22.701, lng: 90.3535 },
  Rangpur: { lat: 25.7439, lng: 89.2752 },
  Mymensingh: { lat: 24.7471, lng: 90.4203 }
};

/**
 * Approximate coordinates for a district/area, used only as a fallback point
 * for the map when a donor hasn't set a precise location. Not exact — there's
 * no reliable per-district coordinate source we could verify for all 64
 * districts — but it places someone in the right region instead of always
 * defaulting to Dhaka, which was actively wrong for the other 63 districts.
 */
export function lookupCoordinates(district: string, area: string): { lat: number; lng: number } {
  const division = DISTRICT_TO_DIVISION[district];
  const center = DIVISION_CENTERS[division] || DIVISION_CENTERS.Dhaka;
  // Small deterministic offset so different areas within a district don't all
  // land on exactly the same pixel.
  let hash = 0;
  for (let i = 0; i < area.length; i++) hash = (hash * 31 + area.charCodeAt(i)) >>> 0;
  const offsetLat = ((hash % 9) - 4) * 0.008;
  const offsetLng = (((hash >> 4) % 9) - 4) * 0.008;
  return {
    lat: Math.round((center.lat + offsetLat) * 10000) / 10000,
    lng: Math.round((center.lng + offsetLng) * 10000) / 10000
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
    avatar: row.avatar || '',
    role: row.role,
    bloodGroup: row.blood_group,
    birthYear: row.birth_year ?? null,
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
    donationCount: row.donation_count ?? 0,
    badges: [],
    donationsHistory: []
  };
}



export async function updateDonorProfile(
  donorId: string,
  updates: Partial<{
    name: string;
    phone: string;
    whatsapp: string;
    bloodGroup: BloodGroup;
    birthYear: number | null;
    avatar: string;
    district: string;
    area: string;
    lastDonationDate: string;
    isSmoker: boolean;
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
  if (updates.birthYear !== undefined) dbUpdates.birth_year = updates.birthYear;
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
  if (updates.district !== undefined) dbUpdates.district = updates.district;
  if (updates.area !== undefined) dbUpdates.area = updates.area;
  if (updates.isSmoker !== undefined) dbUpdates.is_smoker = updates.isSmoker;
  // The set_next_eligible trigger recomputes next_eligible_date (+120 days)
  // whenever this changes, so we never store that date by hand.
  if (updates.lastDonationDate !== undefined) {
    dbUpdates.last_donation_date = updates.lastDonationDate || null;
  }
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

// Update an existing emergency request. RLS (requests_update_owner_or_admin)
// means this only succeeds for the person who posted it, or an admin.
export async function updateRequestInDb(
  requestId: string,
  updates: Partial<EmergencyRequest>
): Promise<EmergencyRequest | null> {
  if (!supabase) {
    return null;
  }

  const dbUpdates: Record<string, any> = {};
  if (updates.patientName !== undefined) dbUpdates.patient_name = updates.patientName;
  if (updates.age !== undefined) dbUpdates.age = updates.age;
  if (updates.bloodGroup !== undefined) dbUpdates.blood_group = updates.bloodGroup;
  if (updates.hospitalName !== undefined) dbUpdates.hospital_name = updates.hospitalName;
  if (updates.district !== undefined) dbUpdates.district = updates.district;
  if (updates.area !== undefined) dbUpdates.area = updates.area;
  if (updates.requiredBags !== undefined) dbUpdates.required_bags = updates.requiredBags;
  if (updates.neededByTime !== undefined) dbUpdates.needed_by_time = updates.neededByTime;
  if (updates.urgency !== undefined) dbUpdates.urgency = updates.urgency;
  if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
  if (updates.contactWhatsapp !== undefined) dbUpdates.contact_whatsapp = updates.contactWhatsapp;
  if (updates.reason !== undefined) dbUpdates.reason = updates.reason;
  if (updates.status !== undefined) dbUpdates.status = updates.status;

  if (Object.keys(dbUpdates).length === 0) return null;

  const { data, error } = await supabase
    .from('requests')
    .update(dbUpdates)
    .eq('id', requestId)
    .select()
    .single();

  if (error || !data) {
    console.error('Supabase update request error:', error);
    return null;
  }
  return mapDbRequestToRequest(data);
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
    relatedRequestId: row.related_request_id || undefined,
    relatedDonorId: row.related_donor_id || row.actor_donor_id || undefined
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
    avatar: '',
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

// ============ SUPABASE: Closing the donation loop ============
//
// Three steps, so neither side can fake a donation:
//   offerToDonate      — donor says "I can help"
//   recordDonation     — requester says "this person donated"
//   confirmMyDonation  — donor confirms, and only then is credit awarded

export async function offerToDonate(
  requestId: string,
  message = ''
): Promise<{ ok: boolean; error: string | null }> {
  if (!supabase) return { ok: false, error: 'Not connected.' };

  const { error } = await supabase.rpc('offer_to_donate', {
    p_request_id: requestId,
    p_message: message
  });

  if (error) {
    console.error('offer_to_donate error:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function recordDonation(
  requestId: string,
  donorId: string,
  units = 1
): Promise<{ ok: boolean; error: string | null }> {
  if (!supabase) return { ok: false, error: 'Not connected.' };

  const { error } = await supabase.rpc('record_donation', {
    p_request_id: requestId,
    p_donor_id: donorId,
    p_units: units
  });

  if (error) {
    console.error('record_donation error:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export interface PendingConfirmation {
  donationId: string;
  requestId: string;
  patientName: string;
  hospitalName: string;
  bloodGroup: string;
  units: number;
  donatedAt: string;
}

/** Donations the requester logged that this donor hasn't confirmed yet. */
export async function fetchMyPendingConfirmations(donorId: string): Promise<PendingConfirmation[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('v_my_pending_confirmations')
    .select('*')
    .eq('donor_id', donorId);

  if (error) {
    console.error('Fetch pending confirmations error:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    donationId: row.donation_id,
    requestId: row.request_id,
    patientName: row.patient_name || 'a patient',
    hospitalName: row.hospital_name || '',
    bloodGroup: row.blood_group || '',
    units: row.units ?? 1,
    donatedAt: row.donated_at || ''
  }));
}

export async function confirmMyDonation(
  donationId: string
): Promise<{ ok: boolean; error: string | null }> {
  if (!supabase) return { ok: false, error: 'Not connected.' };

  const { error } = await supabase.rpc('confirm_my_donation', { p_donation_id: donationId });

  if (error) {
    console.error('confirm_my_donation error:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

/** Has the signed-in donor already offered to help with this request? */
export async function fetchMyOfferedRequestIds(donorId: string): Promise<string[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('request_responses')
    .select('request_id')
    .eq('donor_id', donorId);

  if (error) return [];
  return (data || []).map((r: any) => r.request_id);
}

// ============ SUPABASE: Hospitals ============
export interface HospitalStats {
  hospitalId: string;
  hospitalName: string;
  district: string;
  area: string;
  activeRequests: number;
  criticalRequests: number;
  bagsNeeded: number;
  unitsThisMonth: number;
  onCallDonors: number;
}

/** Real hospitals from the database, replacing the old mockData list. */
export async function fetchHospitalStats(): Promise<HospitalStats[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('v_hospital_stats')
    .select('*')
    .order('active_requests', { ascending: false });

  if (error) {
    console.error('Fetch hospital stats error:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    hospitalId: row.hospital_id,
    hospitalName: row.hospital_name || 'Unnamed hospital',
    district: row.district || '',
    area: row.area || '',
    activeRequests: row.active_requests ?? 0,
    criticalRequests: row.critical_requests ?? 0,
    bagsNeeded: row.bags_needed ?? 0,
    unitsThisMonth: row.units_this_month ?? 0,
    onCallDonors: row.on_call_donors ?? 0
  }));
}

/**
 * Records a verified donation. The database function credits the donor
 * (+150 points, +1 life saved, 120-day clock reset), closes the request and
 * notifies the donor. Only hospital staff and admins may call it.
 */
export async function verifyDonation(
  requestId: string,
  donorId: string,
  units = 1
): Promise<{ ok: boolean; error: string | null }> {
  if (!supabase) return { ok: false, error: 'Not connected.' };

  const { error } = await supabase.rpc('verify_donation', {
    p_request_id: requestId,
    p_donor_id: donorId,
    p_units: units
  });

  if (error) {
    console.error('verify_donation error:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

/** Donors who responded to a request — the real "checked in" list. */
export async function fetchRequestResponders(requestId: string): Promise<
  { donorId: string; donorName: string; bloodGroup: string }[]
> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('request_responses')
    .select('donor_id, donors(name, blood_group)')
    .eq('request_id', requestId);

  if (error) {
    console.error('Fetch responders error:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    donorId: row.donor_id,
    donorName: row.donors?.name || 'Donor',
    bloodGroup: row.donors?.blood_group || ''
  }));
}

export interface CompletedDonation {
  donationId: string;
  requestId: string;
  patientName: string;
  hospitalName: string;
  units: number;
  donatedDate: string;
  donorName: string;
  bloodGroup: string;
  district: string;
  area: string;
}

/** Public "success stories" feed — who donated for whom, once confirmed. */
export async function fetchCompletedDonations(): Promise<CompletedDonation[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('v_completed_donations')
    .select('*')
    .order('donated_date', { ascending: false });

  if (error) {
    console.error('Fetch completed donations error:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    donationId: row.donation_id,
    requestId: row.request_id,
    patientName: row.patient_name || 'a patient',
    hospitalName: row.hospital_name || '',
    units: row.units ?? 1,
    donatedDate: row.donated_date || '',
    donorName: row.donor_name || 'A donor',
    bloodGroup: row.blood_group || '',
    district: row.district || '',
    area: row.area || ''
  }));
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
  birthYear?: number | null;
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
  const looksLikeExistingAccount = !!signedUpUser
    && Array.isArray((signedUpUser as any).identities)
    && (signedUpUser as any).identities.length === 0;
  const signUpErrorMessage = signUpError?.message || '';
  const isDuplicateEmailError =
    looksLikeExistingAccount ||
    /already registered|duplicate|user already exists|email.*already/i.test(signUpErrorMessage);

  if (signUpError || !signedUpUser || looksLikeExistingAccount) {
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

  // setSession() above fires the onAuthStateChange listener (subscribeToAuthState),
  // which asynchronously calls link_or_get_my_donor to ensure a donor row exists.
  // That can race ahead of the insert below and create the row first, so check
  // for it (and merge the submitted profile in) instead of inserting a duplicate.
  const donorPayload = {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    whatsapp: profile.phone,
    role: 'donor',
    blood_group: profile.bloodGroup,
    birth_year: profile.birthYear ?? null,
    district: profile.district,
    area: profile.area,
    is_smoker: profile.isSmoker
  };

  async function upsertDonorRow(): Promise<{ data: any; error: any }> {
    const existing = await supabase!.from('donors').select('*').eq('auth_user_id', userId).maybeSingle();
    if (existing.data) {
      return supabase!.from('donors').update(donorPayload).eq('id', existing.data.id).select().single();
    }

    const inserted = await supabase!
      .from('donors')
      .insert({
        auth_user_id: userId,
        ...donorPayload,
        lat: 23.8103,
        lng: 90.4125,
        last_donation_date: null,
        next_eligible_date: null,
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

    if (inserted.error?.code === '23505') {
      // Lost the race between our check and our insert — fetch the row the
      // listener created and fill in the profile the donor just submitted.
      const retry = await supabase!.from('donors').select('*').eq('auth_user_id', userId).maybeSingle();
      if (retry.data) {
        return supabase!.from('donors').update(donorPayload).eq('id', retry.data.id).select().single();
      }
    }
    return inserted;
  }

  const { data: donorData, error: donorError } = await upsertDonorRow();

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
  if (!donorRes.data && !donorRes.error) {
    const linked = await supabase.rpc('link_or_get_my_donor');
    if (linked.error) {
      console.error('link_or_get_my_donor error:', linked.error.message);
    } else if (linked.data) {
      donorRes = { ...donorRes, data: linked.data } as typeof donorRes;
    }
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
  if (!donorRes.data && !donorRes.error) {
    const linked = await supabase.rpc('link_or_get_my_donor');
    if (linked.error) {
      console.error('link_or_get_my_donor error:', linked.error.message);
    } else if (linked.data) {
      donorRes = { ...donorRes, data: linked.data } as typeof donorRes;
    }
  }

  if (donorRes.error || !donorRes.data) {
    if (donorRes.error) console.error('Supabase donor restore error:', donorRes.error.message);
    return null;
  }

  const restored = mapDbDonorToProfile(donorRes.data);
  restored.healthInfo = { ...(restored.healthInfo || {}), ...(await fetchMyHealthInfo(restored.id)) } as any;
  return restored;
}

export function subscribeToAuthState(onChange: (donor: DonorProfile | null) => void, onPasswordRecovery?: () => void): () => void {
  if (!supabase) return () => {};

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      onPasswordRecovery?.();
      return;
    }
    if (event === 'SIGNED_OUT' || !session?.user) {
      onChange(null);
      return;
    }

    // Let Supabase finish its internal token storage before querying donor data.
    window.setTimeout(async () => {
      onChange(await getCurrentDonorFromSession());
    }, 0);
  });

  return () => data.subscription.unsubscribe();
}

export async function updatePassword(password: string): Promise<string | null> {
  if (!supabase) return 'Supabase client not configured.';
  const { error } = await supabase.auth.updateUser({ password });
  return error?.message || null;
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
