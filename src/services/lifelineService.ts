import { GoogleGenAI } from '@google/genai';
import { BANGLADESH_DISTRICTS, INITIAL_BADGES, INITIAL_DONORS, INITIAL_REQUESTS } from '../mockData';
import { BloodGroup, DonorProfile, EmergencyRequest, NotificationItem, RewardBadge, SearchFilters } from '../types';

const STORAGE_KEY = 'LIFELINE_BD_STATE_V2';

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

  const initialUser = INITIAL_DONORS[0]; // Arif Rahaman
  const initialNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      title: '🚨 Nearby Emergency: O- Required!',
      message: 'Mrs. Salma Begum (64y) needs 2 bags at United Hospital, Gulshan. Only 1.8km away.',
      type: 'emergency',
      time: '10m ago',
      read: false,
      relatedBloodGroup: 'O-',
      relatedRequestId: 'req-1'
    },
    {
      id: 'notif-2',
      title: '🩸 Eligible to Donate Again!',
      message: 'Your 120-day waiting period since May 24 has concluded. Thank you for saving 5 lives!',
      type: 'reminder',
      time: '2h ago',
      read: false
    },
    {
      id: 'notif-3',
      title: '🏆 Gold Hero Badge Earned',
      message: 'Congratulations! You unlocked the Gold Hero badge for verified contributions.',
      type: 'reward',
      time: '1d ago',
      read: true
    }
  ];

  const newState: AppState = {
    donors: INITIAL_DONORS,
    requests: INITIAL_REQUESTS,
    badges: INITIAL_BADGES,
    currentUser: initialUser,
    notifications: initialNotifications,
    token: 'jwt_mock_token_lifelinebd_9988'
  };

  saveAppState(newState);
  return newState;
}

export function saveAppState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are the AI Health Advisor for LifelineBD, Bangladesh's modern blood donation network.
User profile context: Name: ${userContext?.name || 'Guest'}, Blood Group: ${userContext?.bloodGroup || 'Unknown'}, Location: ${userContext?.district || 'Bangladesh'}.
Keep responses empathetic, scientifically accurate, concise (max 3 short bullet points or paragraphs), and focused on blood donation safety, nutritional tips in Bangladesh (iron rich food like spinach/kochu shak, dates, lentils), or drafting urgent appeal messages.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction }
      });
      if (response.text) return response.text;
    } catch {
      // Fallback
    }
  }

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
