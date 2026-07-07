export type UserRole = 'donor' | 'hospital' | 'admin';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface HealthInfo {
  weightKg: number;
  bloodPressure: string;
  hemoglobin: number; // g/dL
  hasChronicDisease: boolean;
  recentMedication: string;
  hbsagStatus?: 'Not Tested' | 'Negative' | 'Positive';
  hcvStatus?: 'Not Tested' | 'Negative' | 'Positive';
  hivStatus?: 'Not Tested' | 'Negative' | 'Positive';
  syphilisStatus?: 'Not Tested' | 'Negative' | 'Positive';
  malariaStatus?: 'Not Tested' | 'Negative' | 'Positive';
  healthMetrics?: {
    hbsag?: string; // Hepatitis B surface antigen
    anti_hcv?: string; // Hepatitis C
    anti_hiv?: string; // HIV
    vdrl?: string; // Syphilis
    mp?: string; // Malaria parasite
  };
}

export interface DonationRecord {
  id: string;
  date: string;
  hospitalName: string;
  patientName: string;
  units: number;
  certificateUrl?: string;
  status: 'Completed' | 'Pending Verification';
}

export interface DonorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  avatar: string;
  role: UserRole;
  bloodGroup: BloodGroup;
  district: string;
  area: string;
  lat: number;
  lng: number;
  lastDonationDate: string; // YYYY-MM-DD
  nextEligibleDate: string; // YYYY-MM-DD
  isSmoker: boolean;
  isRegular: boolean;
  isVerified: boolean;
  availableNow: boolean;
  healthInfo: HealthInfo;
  impactScore: number;
  livesSaved: number;
  badges: string[];
  donationsHistory: DonationRecord[];
}

export interface EmergencyRequest {
  id: string;
  patientName: string;
  age: number;
  bloodGroup: BloodGroup;
  hospitalName: string;
  district: string;
  area: string;
  requiredBags: number;
  neededByTime: string; // e.g. "Today, 6:00 PM"
  urgency: 'Critical' | 'High' | 'Medium';
  contactPhone: string;
  contactWhatsapp: string;
  reason: string;
  status: 'Pending' | 'Fulfilled' | 'In Progress';
  createdAt: string;
  requesterId: string;
  matchedDonorsCount: number;
}

export interface RewardBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  pointsRequired: number;
  achieved: boolean;
  category: 'donation' | 'streak' | 'emergency' | 'verified';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'emergency' | 'reminder' | 'reward' | 'system';
  time: string;
  read: boolean;
  relatedBloodGroup?: BloodGroup;
  relatedRequestId?: string;
}

export interface SearchFilters {
  bloodGroup: string;
  district: string;
  area: string;
  verifiedOnly: boolean;
  nonSmokerOnly: boolean;
  regularOnly: boolean;
  availableNowOnly: boolean;
  maxDistanceKm: number;
}

export interface DistrictOption {
  name: string;
  areas: string[];
  lat: number;
  lng: number;
}
