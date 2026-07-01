import { DistrictOption, DonorProfile, EmergencyRequest, RewardBadge } from './types';

export const BANGLADESH_DISTRICTS: DistrictOption[] = [
  {
    name: 'Dhaka',
    areas: ['Banani', 'Gulshan', 'Dhanmondi', 'Uttara', 'Mirpur', 'Mohakhali', 'Motijheel', 'Bashundhara R/A', 'Wari'],
    lat: 23.8103,
    lng: 90.4125
  },
  {
    name: 'Chattogram',
    areas: ['Agrabad', 'Nasirabad', 'GEC Circle', 'Halishahar', 'Panchlaish', 'Jamalkhan', 'Kotwali'],
    lat: 22.3569,
    lng: 91.7832
  },
  {
    name: 'Sylhet',
    areas: ['Zindabazar', 'Ambarkhana', 'Subidbazar', 'Shahjalal Uposhohor', 'Chowhatta', 'Bandar Bazar'],
    lat: 24.8949,
    lng: 91.8687
  },
  {
    name: 'Rajshahi',
    areas: ['Shaheb Bazar', 'Motihar', 'Upashahar', 'Kazla', 'Boalia'],
    lat: 24.3745,
    lng: 88.6042
  },
  {
    name: 'Khulna',
    areas: ['Sonadanga', 'Khalishpur', 'Daulatpur', 'Boyra', 'Shib Bari'],
    lat: 22.8456,
    lng: 89.5403
  },
  {
    name: 'Barishal',
    areas: ['Sadar Road', 'Nathullabad', 'Rupatali', 'Amanatganj'],
    lat: 22.7010,
    lng: 90.3535
  },
  {
    name: 'Rangpur',
    areas: ['Jahaj Company Circle', 'Modern More', 'Lalbagh', 'Shapla Chattar'],
    lat: 25.7439,
    lng: 89.2752
  },
  {
    name: 'Mymensingh',
    areas: ['Ganginarpar', 'Charpara', 'Town Hall', 'Kewatkhali'],
    lat: 24.7471,
    lng: 90.4203
  }
];

export const INITIAL_BADGES: RewardBadge[] = [
  {
    id: 'b1',
    name: 'Life Saver',
    icon: 'Heart',
    description: 'Donated blood for the very first time',
    pointsRequired: 100,
    achieved: true,
    category: 'donation'
  },
  {
    id: 'b2',
    name: 'Gold Hero',
    icon: 'ShieldCheck',
    description: 'Saved 5 lives through verified emergency requests',
    pointsRequired: 1000,
    achieved: true,
    category: 'emergency'
  },
  {
    id: 'b3',
    name: 'Regular Guardian',
    icon: 'CalendarCheck',
    description: 'Maintained 3 consecutive regular donations within eligible window',
    pointsRequired: 1500,
    achieved: true,
    category: 'streak'
  },
  {
    id: 'b4',
    name: 'Verified Champion',
    icon: 'Award',
    description: 'Completed hospital verified health screening',
    pointsRequired: 500,
    achieved: true,
    category: 'verified'
  },
  {
    id: 'b5',
    name: 'Platinum Lifeline',
    icon: 'Crown',
    description: 'Earned over 5,000 impact points on LifelineBD',
    pointsRequired: 5000,
    achieved: false,
    category: 'donation'
  },
  {
    id: 'b6',
    name: 'Midnight Express',
    icon: 'Zap',
    description: 'Responded to an urgent request between midnight and 6 AM',
    pointsRequired: 800,
    achieved: false,
    category: 'emergency'
  }
];

export const INITIAL_DONORS: DonorProfile[] = [
  {
    id: 'user-current',
    name: 'Arif Rahaman',
    email: 'arif.rahaman@lifelinebd.org',
    phone: '+880 1711-234567',
    whatsapp: '8801711234567',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arif',
    role: 'donor',
    bloodGroup: 'B+',
    district: 'Dhaka',
    area: 'Banani',
    lat: 23.7937,
    lng: 90.4066,
    lastDonationDate: '2024-05-24',
    nextEligibleDate: '2024-09-24',
    isSmoker: false,
    isRegular: true,
    isVerified: true,
    availableNow: true,
    healthInfo: {
      weightKg: 72,
      bloodPressure: '120/80',
      hemoglobin: 14.8,
      hasChronicDisease: false,
      recentMedication: 'None'
    },
    impactScore: 2450,
    livesSaved: 5,
    badges: ['Life Saver', 'Gold Hero', 'Regular Guardian', 'Verified Champion'],
    donationsHistory: [
      {
        id: 'don-1',
        date: '2024-05-24',
        hospitalName: 'United Hospital Limited',
        patientName: 'Kazi Rakib',
        units: 1,
        status: 'Completed'
      },
      {
        id: 'don-2',
        date: '2024-01-15',
        hospitalName: 'Square Hospitals Ltd',
        patientName: 'Mrs. Jahanara',
        units: 1,
        status: 'Completed'
      },
      {
        id: 'don-3',
        date: '2023-09-10',
        hospitalName: 'Kurmitola General Hospital',
        patientName: 'Md. Shafiqul',
        units: 1,
        status: 'Completed'
      }
    ]
  },
  {
    id: 'donor-2',
    name: 'Dr. S. Alam',
    email: 's.alam@dmch.gov.bd',
    phone: '+880 1819-887766',
    whatsapp: '8801819887766',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DrAlam',
    role: 'donor',
    bloodGroup: 'O-',
    district: 'Dhaka',
    area: 'Dhanmondi',
    lat: 23.7461,
    lng: 90.3742,
    lastDonationDate: '2024-04-10',
    nextEligibleDate: '2024-08-10',
    isSmoker: false,
    isRegular: true,
    isVerified: true,
    availableNow: true,
    healthInfo: {
      weightKg: 68,
      bloodPressure: '115/75',
      hemoglobin: 15.2,
      hasChronicDisease: false,
      recentMedication: 'None'
    },
    impactScore: 4900,
    livesSaved: 12,
    badges: ['Life Saver', 'Gold Hero', 'Regular Guardian', 'Verified Champion'],
    donationsHistory: []
  },
  {
    id: 'donor-3',
    name: 'Mehedi Hasan',
    email: 'mehedi.tech@buet.ac.bd',
    phone: '+880 1912-334455',
    whatsapp: '8801912334455',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mehedi',
    role: 'donor',
    bloodGroup: 'AB+',
    district: 'Dhaka',
    area: 'Gulshan',
    lat: 23.7925,
    lng: 90.4168,
    lastDonationDate: '2024-06-01',
    nextEligibleDate: '2024-10-01',
    isSmoker: false,
    isRegular: true,
    isVerified: true,
    availableNow: true,
    healthInfo: {
      weightKg: 75,
      bloodPressure: '125/82',
      hemoglobin: 14.5,
      hasChronicDisease: false,
      recentMedication: 'None'
    },
    impactScore: 3200,
    livesSaved: 9,
    badges: ['Life Saver', 'Gold Hero'],
    donationsHistory: []
  },
  {
    id: 'donor-4',
    name: 'Nusrat Jahan',
    email: 'nusrat.j@northsouth.edu',
    phone: '+880 1611-998877',
    whatsapp: '8801611998877',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nusrat',
    role: 'donor',
    bloodGroup: 'B+',
    district: 'Dhaka',
    area: 'Bashundhara R/A',
    lat: 23.8151,
    lng: 90.4255,
    lastDonationDate: '2024-02-20',
    nextEligibleDate: '2024-06-20',
    isSmoker: false,
    isRegular: false,
    isVerified: true,
    availableNow: true,
    healthInfo: {
      weightKg: 56,
      bloodPressure: '110/70',
      hemoglobin: 13.2,
      hasChronicDisease: false,
      recentMedication: 'Vitamin D'
    },
    impactScore: 1800,
    livesSaved: 4,
    badges: ['Life Saver'],
    donationsHistory: []
  },
  {
    id: 'donor-5',
    name: 'Tanvir Ahmed',
    email: 'tanvir.ctg@gmail.com',
    phone: '+880 1818-112233',
    whatsapp: '8801818112233',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tanvir',
    role: 'donor',
    bloodGroup: 'A+',
    district: 'Chattogram',
    area: 'Agrabad',
    lat: 22.3242,
    lng: 91.8105,
    lastDonationDate: '2024-03-12',
    nextEligibleDate: '2024-07-12',
    isSmoker: true,
    isRegular: true,
    isVerified: false,
    availableNow: true,
    healthInfo: {
      weightKg: 80,
      bloodPressure: '130/85',
      hemoglobin: 15.5,
      hasChronicDisease: false,
      recentMedication: 'None'
    },
    impactScore: 1400,
    livesSaved: 3,
    badges: ['Life Saver'],
    donationsHistory: []
  },
  {
    id: 'donor-6',
    name: 'Farhana Akter',
    email: 'farhana.syl@yahoo.com',
    phone: '+880 1717-445566',
    whatsapp: '8801717445566',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Farhana',
    role: 'donor',
    bloodGroup: 'O+',
    district: 'Sylhet',
    area: 'Zindabazar',
    lat: 24.8965,
    lng: 91.8698,
    lastDonationDate: '2024-01-05',
    nextEligibleDate: '2024-05-05',
    isSmoker: false,
    isRegular: true,
    isVerified: true,
    availableNow: true,
    healthInfo: {
      weightKg: 62,
      bloodPressure: '118/76',
      hemoglobin: 13.8,
      hasChronicDisease: false,
      recentMedication: 'None'
    },
    impactScore: 2900,
    livesSaved: 7,
    badges: ['Life Saver', 'Gold Hero', 'Regular Guardian'],
    donationsHistory: []
  },
  {
    id: 'donor-7',
    name: 'Shakil Mahmud',
    email: 'shakil.m@uttara.com',
    phone: '+880 1515-778899',
    whatsapp: '8801515778899',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shakil',
    role: 'donor',
    bloodGroup: 'AB-',
    district: 'Dhaka',
    area: 'Uttara',
    lat: 23.8759,
    lng: 90.3795,
    lastDonationDate: '2024-05-10',
    nextEligibleDate: '2024-09-10',
    isSmoker: false,
    isRegular: true,
    isVerified: true,
    availableNow: false,
    healthInfo: {
      weightKg: 70,
      bloodPressure: '120/80',
      hemoglobin: 14.1,
      hasChronicDisease: false,
      recentMedication: 'None'
    },
    impactScore: 2100,
    livesSaved: 5,
    badges: ['Life Saver', 'Gold Hero'],
    donationsHistory: []
  },
  {
    id: 'donor-8',
    name: 'Kamrul Islam',
    email: 'kamrul.raj@edu.bd',
    phone: '+880 1712-665544',
    whatsapp: '8801712665544',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kamrul',
    role: 'donor',
    bloodGroup: 'B-',
    district: 'Rajshahi',
    area: 'Shaheb Bazar',
    lat: 24.3685,
    lng: 88.6010,
    lastDonationDate: '2023-11-20',
    nextEligibleDate: '2024-03-20',
    isSmoker: false,
    isRegular: true,
    isVerified: true,
    availableNow: true,
    healthInfo: {
      weightKg: 65,
      bloodPressure: '122/78',
      hemoglobin: 14.9,
      hasChronicDisease: false,
      recentMedication: 'None'
    },
    impactScore: 2650,
    livesSaved: 6,
    badges: ['Life Saver', 'Gold Hero'],
    donationsHistory: []
  }
];

export const INITIAL_REQUESTS: EmergencyRequest[] = [
  {
    id: 'req-1',
    patientName: 'Mrs. Salma Begum',
    age: 64,
    bloodGroup: 'O-',
    hospitalName: 'United Hospital Limited',
    district: 'Dhaka',
    area: 'Gulshan',
    requiredBags: 2,
    neededByTime: 'Today, 4:00 PM',
    urgency: 'Critical',
    contactPhone: '+880 1711-889900',
    contactWhatsapp: '8801711889900',
    reason: 'Emergency Open Heart Surgery requirement.',
    status: 'Pending',
    createdAt: '2024-06-28T10:30:00Z',
    requesterId: 'hosp-1',
    matchedDonorsCount: 3
  },
  {
    id: 'req-2',
    patientName: 'Master Ayan Chowdhury',
    age: 8,
    bloodGroup: 'AB+',
    hospitalName: 'Evercare Hospital',
    district: 'Chattogram',
    area: 'Nasirabad',
    requiredBags: 1,
    neededByTime: 'Tomorrow, 10:00 AM',
    urgency: 'High',
    contactPhone: '+880 1819-443322',
    contactWhatsapp: '8801819443322',
    reason: 'Scheduled regular transfusion for Thalassemia patient.',
    status: 'In Progress',
    createdAt: '2024-06-28T08:15:00Z',
    requesterId: 'hosp-2',
    matchedDonorsCount: 5
  },
  {
    id: 'req-3',
    patientName: 'Md. Ruhul Amin',
    age: 42,
    bloodGroup: 'B+',
    hospitalName: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    area: 'Motijheel',
    requiredBags: 3,
    neededByTime: 'Today, 8:00 PM',
    urgency: 'Critical',
    contactPhone: '+880 1911-223344',
    contactWhatsapp: '8801911223344',
    reason: 'Road accident casualty requiring immediate emergency blood transfusion.',
    status: 'Pending',
    createdAt: '2024-06-28T11:45:00Z',
    requesterId: 'donor-3',
    matchedDonorsCount: 8
  },
  {
    id: 'req-4',
    patientName: 'Suraiya Akter',
    age: 28,
    bloodGroup: 'A-',
    hospitalName: 'Mount Adora Hospital',
    district: 'Sylhet',
    area: 'Subidbazar',
    requiredBags: 2,
    neededByTime: 'Tonight, 11:00 PM',
    urgency: 'High',
    contactPhone: '+880 1715-667788',
    contactWhatsapp: '8801715667788',
    reason: 'Complications during C-section delivery.',
    status: 'Pending',
    createdAt: '2024-06-28T12:10:00Z',
    requesterId: 'donor-6',
    matchedDonorsCount: 2
  }
];

export const HOSPITAL_ACCOUNTS = [
  {
    id: 'hosp-1',
    name: 'United Hospital Limited',
    email: 'bloodbank@uhl.com.bd',
    district: 'Dhaka',
    area: 'Gulshan',
    verified: true
  },
  {
    id: 'hosp-2',
    name: 'Evercare Hospital Chattogram',
    email: 'bloodbank@evercare.com.bd',
    district: 'Chattogram',
    area: 'Nasirabad',
    verified: true
  },
  {
    id: 'hosp-3',
    name: 'Square Hospitals Ltd',
    email: 'info@squarehospital.com',
    district: 'Dhaka',
    area: 'Dhanmondi',
    verified: true
  }
];
