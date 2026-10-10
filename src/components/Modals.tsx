import { AlertCircle, Award, Bell, Calendar, Eye, EyeOff, MapPin, Phone, ShieldCheck, Sparkles, Upload, User, X } from 'lucide-react';
import React, { useState } from 'react';
import { useDistricts } from '../hooks/useDistricts';
import { backdropClose, useDismissable } from '../hooks/useDismissable';
import { defineStrings, fmt, formatNumber, useStrings, type Lang } from '../i18n';
import { calculateAge, completeDonorProfile, getCurrentDonorFromSession, getDonorContact, getWhatsAppUrl, isDonorAvailableNow, isValidDonorName, sendMagicLink, sendPasswordResetEmail, signInDonor, signInWithGoogle, signOutDonor, signUpDonor, updatePassword, uploadAvatar, updateDonorProfile } from '../services/lifelineService';
import { BloodGroup, DonorProfile, EmergencyRequest, NotificationItem } from '../types';
import { Avatar } from './Avatar';
import { AreaField } from './AreaField';
import { CompactSelect } from './CompactSelect';

/* ---------- Bangladeshi phone number helpers ----------
 * People type their number the way they say it: 01712345678.
 * Storage and WhatsApp links need the country code. These accept whatever the
 * person typed (spaces, dashes, +880, 880, or a leading 0) and normalise it, so
 * nobody has to think about dialling codes.
 */
function bdDigits(input: string): string {
  let d = (input || '').replace(/\D/g, '');   // strip spaces, dashes, plus
  if (d.startsWith('00880')) d = d.slice(5);
  if (d.startsWith('880')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);      // 01712345678 -> 1712345678
  return d;
}

/** For display/calling: +8801712345678 */
export function toBdDialing(input: string): string {
  const d = bdDigits(input);
  return d ? `+880${d}` : '';
}

/** Valid BD mobile: 01X-XXXXXXXX where X (operator) is 3-9. */
function isValidBdMobile(input: string): boolean {
  return /^1[3-9]\d{8}$/.test(bdDigits(input));
}

/** For wa.me links: 8801712345678 (no plus) */
export function toBdWhatsapp(input: string): string {
  const d = bdDigits(input);
  return d ? `880${d}` : '';
}

/* ---------- UI text (English / Bangla) ----------
 * Display text only. Values that are stored or compared in logic (urgency
 * 'Critical'/'High'/'Medium', screening status 'Not Tested'/'Negative'/
 * 'Positive', blood groups, districts/areas, the default request reason) stay
 * as they are and are mapped to these labels at render time.
 */
const S = defineStrings(
  {
    // Shared form labels / buttons / messages
    bloodGroup: 'Blood Group',
    district: 'District',
    area: 'Area',
    optional: '(Optional)',
    whatsappNumber: 'WhatsApp Number',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    birthYear: 'Birth Year',
    birthYearPlaceholder: 'e.g. 1995',
    selectBloodGroup: 'Select blood group',
    smokerCheckbox: 'I am a smoker (health note)',
    saving: 'Saving...',
    saveChanges: 'Save Changes',
    errNameSymbols: 'Please enter your name (not just symbols).',
    errSelectBloodGroup: 'Please select your blood group.',

    // 1. Request blood modal
    closeRequestDialog: 'Close request dialog',
    requestTitleEdit: 'Edit Blood Requisition',
    requestTitleNew: 'Broadcast Blood Requisition',
    requestSubtitleEdit: 'Updates the live feed for everyone',
    requestSubtitleNew: 'Pushes immediate live feed & notification',
    errRequestUpdate: 'Could not update the request. You can only edit your own.',
    errRequestSave: 'Request was not saved. Please sign in or try again.',
    patientFullName: 'Patient Full Name',
    patientNamePlaceholder: 'e.g. Mrs. Rahima Begum',
    age: 'Age',
    hospitalName: 'Hospital / Clinic Name',
    hospitalPlaceholder: 'e.g. Dhaka Medical College Hospital',
    requiredBags: 'Required Bags',
    neededByTime: 'Needed By Time',
    urgencyPriority: 'Urgency Priority',
    urgencyCritical: 'Critical',
    urgencyHigh: 'High',
    urgencyMedium: 'Medium',
    contactPhone: 'Contact Phone Number',
    reasonLabel: 'Reason / Clinical Notes',
    reasonPlaceholder: 'e.g. Emergency C-Section bleeding surgery scheduled at ICU.',
    broadcastRequest: 'Broadcast Emergency Request',

    // 2. Auth modal
    closeAuthDialog: 'Close authentication dialog',
    authTitleRegister: 'Join Roktobondhu Bangladesh',
    authTitleReset: 'Reset Password',
    authTitleNewPassword: 'Set New Password',
    authTitleLogin: 'Welcome Back Hero',
    authSubRegister: 'Register as a verified whole blood donor',
    authSubReset: 'Enter your email to receive password reset instructions',
    authSubNewPassword: 'Choose a new password for your Roktobondhu Bangladesh account',
    authSubLogin: 'Sign in to your Roktobondhu Bangladesh account',
    errInvalidEmail: 'Please enter a valid email, e.g. name@example.com',
    errPasswordLength: 'Password must be at least 6 characters.',
    errPasswordWeak: 'Please use a stronger password: mix capital and small letters, a number and a symbol (e.g. Milad@2420).',
    errPasswordCommon: 'This password is too common and easy to guess. Please choose a different one.',
    errPasswordRejected: 'This password cannot be used. Please try a different one.',
    confirmDiscard: 'Close this form? What you typed will be lost.',
    resetLinkSent: 'If this email is registered, a reset link has been sent. Check your inbox and spam folder, and confirm the spelling.',
    errGeneric: 'Something went wrong. Please try again.',
    errInvalidLogin: 'Incorrect email or password. Please check and try again.',
    errEmailRequired: 'Please enter your email.',
    errPasswordRequired: 'Please enter your password.',
    errPhoneRequired: 'Please enter your mobile number.',
    errPhoneInvalid: 'Please enter a valid 11-digit mobile number, e.g. 01712345678',
    errAreaRequired: 'Please select your area.',
    errBirthYear: 'Please enter a year between 1900 and {year}.',
    errAlreadyRegistered: 'This email already has an account. Please sign in.',
    alreadyRegisteredTitle: 'This email is already registered',
    alreadyRegisteredBody: 'Sign in to your account, or sign up with a different email.',
    signInInstead: 'Sign in',
    useNewEmail: 'Use another email',
    errEmailNotConfirmed: 'Your email is not confirmed yet. Please click the link we sent to your inbox.',
    msgConfirmEmail: 'Almost done! We sent a link to your email. Click it, then sign in.',
    errRateLimit: 'Too many attempts. Please wait a few minutes and try again.',
    errSamePassword: 'Your new password must be different from the old one.',
    errSessionExpired: 'Your session has expired. Please refresh the page and sign in again.',
    errNetwork: 'Connection problem. Please check your internet and try again.',
    errEmailInvalidServer: 'This email doesn\'t look right. Please check it.',
    errMagicLinkNeedsEmail: 'Enter your email above to get a sign-in link.',
    errFixFieldsOne: 'One field needs fixing. Tap here to see it.',
    errFixFieldsMany: '{count} fields need fixing. Tap here to see them.',
    fullNamePlaceholder: 'e.g. John Doe',
    email: 'Email',
    password: 'Password',
    passwordPlaceholder: 'At least 6 characters',
    hidePassword: 'Hide password',
    showPassword: 'Show password',
    forgotPassword: 'Forgot password?',
    errMagicLinkEmail: 'Please enter a valid email address before requesting a magic link.',
    magicLinkSent: 'Magic login link sent to your email. Please check your inbox.',
    loginWithEmailLink: 'Login with email link',
    pleaseWait: 'Please wait...',
    createSecureProfile: 'Create Secure Profile',
    sendResetEmail: 'Send Reset Email',
    updatePassword: 'Update Password',
    signIn: 'Sign In',
    or: 'Or',
    continueWithGoogle: 'Continue with Google',
    switchToLogin: 'Already registered? Sign In instead',
    switchToRegister: 'New donor? Create free profile',

    // 3. Profile modal
    closeProfileDialog: 'Close profile dialog',
    bloodGroupValue: 'Blood Group: {group}',
    ageSuffix: ' · {age}y',
    errSessionRefresh: 'Your session needs a refresh. Please reload the page and try again.',
    errProfileUpdate: 'Failed to update profile. Please try again.',
    phoneCaps: 'PHONE',
    whatsappCaps: 'WHATSAPP',
    notProvided: 'Not provided',
    notAvailableRightNow: 'Not available right now',
    hiddenUntilRevealed: 'Hidden until revealed',
    contactChecked: 'Contact checked',
    checkingAvailability: 'Checking availability...',
    showNumber: 'Show number',
    healthTelemetry: 'DGHS Health Telemetry',
    hemoglobin: 'HEMOGLOBIN',
    bloodPressure: 'BLOOD PRESSURE',
    weight: 'WEIGHT',
    weightValue: '{weight} kg',
    notAvailable: 'Not available',
    donationRecord: 'Donation Record',
    timesDonated: 'Times Donated',
    lastDonated: 'Last Donated',
    nextEligible: 'Next Eligible',
    never: 'Never',
    now: 'Now',
    ttiScreening: 'Mandatory TTI Screening',
    syphilis: 'Syphilis',
    malaria: 'Malaria',
    statusNotTested: 'Not Tested',
    statusNegative: 'Negative',
    statusPositive: 'Positive',
    smokingStatus: 'Smoking Status:',
    smoker: 'Smoker',
    nonSmoker: 'Non-Smoker',
    regularDonor: 'Regular Donor:',
    regularYes: 'Yes (3+ times)',
    regularNew: 'New',
    healthPrivate: 'Individual health and screening results stay private. Only donors who opt in can show a completion badge.',
    screeningCompletionPublic: 'Screening complete · self-reported',
    shareScreeningCompletion: 'Show screening-completion badge publicly',
    shareScreeningCompletionHelp: 'Only the completion badge appears, and only when all five results are recorded as negative. Individual results stay private; this is not independent medical verification.',
    screeningFeatureUnavailable: 'Public screening-completion badges are not available yet.',
    editProfile: 'Edit Profile',
    phone: 'Phone',
    lastDonationDate: 'Last Donation Date',
    screeningEntered: 'Screening results you entered',
    testHbsag: 'HBsAg (Hepatitis B)',
    testHcv: 'Anti-HCV (Hepatitis C)',
    testHiv: 'Anti-HIV',
    testVdrl: 'VDRL (Syphilis)',
    testMp: 'MP Test (Malaria)',
    cancel: 'Cancel',
    availabilityStatus: 'Instant Telemetry Status',
    broadcastingAvailable: 'Broadcasting as Available for Emergency',
    restingOffDuty: 'Set as resting / off-duty',
    availableNowButton: 'Available Now',
    offDutyButton: 'Off-Duty',
    notYetVisibleHint: 'অন্যরা আপনাকে এখনো "Not available" দেখছেন — আপনার পরবর্তী যোগ্যতার তারিখ {date} পর্যন্ত।',
    whatsappMessage: 'WhatsApp Message',
    showNumberFirst: 'Show number first',
    call: 'Call',

    // 4. Notifications modal
    notificationsTitle: 'Live Notification Feed',
    markAllRead: 'Mark all read',
    closeNotificationsDialog: 'Close notifications dialog',
    noNotifications: 'No notifications yet.',
    viewDonorProfile: 'View donor profile',
    openRequestsToConfirm: 'Open Requests to confirm',

    // 5. Complete profile modal
    completeTitle: 'One Last Step',
    completeSubtitle: 'A few required details to finish setting up your donor profile',
    errEnterPhone: 'Please enter your phone number.',
    errSaveProfile: 'Could not save your profile. Please try again.',
    finishSetup: 'Finish Setting Up My Profile'
  },
  {
    // Shared form labels / buttons / messages
    bloodGroup: 'ব্লাড গ্রুপ',
    district: 'জেলা',
    area: 'এলাকা',
    optional: '(ঐচ্ছিক)',
    whatsappNumber: 'WhatsApp নম্বর',
    fullName: 'পূর্ণ নাম',
    phoneNumber: 'ফোন নম্বর',
    birthYear: 'জন্মসাল',
    birthYearPlaceholder: 'যেমন: 1995',
    selectBloodGroup: 'ব্লাড গ্রুপ বাছুন',
    smokerCheckbox: 'আমি ধূমপান করি (স্বাস্থ্য তথ্য)',
    saving: 'সংরক্ষণ হচ্ছে...',
    saveChanges: 'সংরক্ষণ করুন',
    errNameSymbols: 'আপনার নাম লিখুন (শুধু চিহ্ন নয়)।',
    errSelectBloodGroup: 'আপনার ব্লাড গ্রুপ বাছুন।',

    // 1. Request blood modal
    closeRequestDialog: 'অনুরোধ ফর্ম বন্ধ করুন',
    requestTitleEdit: 'রক্তের অনুরোধ এডিট করুন',
    requestTitleNew: 'রক্তের অনুরোধ পোস্ট করুন',
    requestSubtitleEdit: 'সবার লাইভ ফিডে আপডেট হবে',
    requestSubtitleNew: 'সঙ্গে সঙ্গে লাইভ ফিডে ও নোটিফিকেশনে যাবে',
    errRequestUpdate: 'অনুরোধটি আপডেট করা যায়নি। আপনি শুধু নিজের অনুরোধ এডিট করতে পারবেন।',
    errRequestSave: 'অনুরোধটি সংরক্ষণ হয়নি। সাইন ইন করুন অথবা আবার চেষ্টা করুন।',
    patientFullName: 'রোগীর পূর্ণ নাম',
    patientNamePlaceholder: 'যেমন: রহিমা বেগম',
    age: 'বয়স',
    hospitalName: 'হাসপাতাল / ক্লিনিকের নাম',
    hospitalPlaceholder: 'যেমন: ঢাকা মেডিকেল কলেজ হাসপাতাল',
    requiredBags: 'কত ব্যাগ লাগবে',
    neededByTime: 'কখন লাগবে',
    urgencyPriority: 'কতটা জরুরি',
    urgencyCritical: 'অতি জরুরি',
    urgencyHigh: 'জরুরি',
    urgencyMedium: 'সাধারণ',
    contactPhone: 'যোগাযোগের ফোন নম্বর',
    reasonLabel: 'কারণ / চিকিৎসার তথ্য',
    reasonPlaceholder: 'যেমন: জরুরি সিজারিয়ান অপারেশনে রক্তক্ষরণ, ICU-তে অপারেশন হবে।',
    broadcastRequest: 'জরুরি অনুরোধ পোস্ট করুন',

    // 2. Auth modal
    closeAuthDialog: 'সাইন ইন ফর্ম বন্ধ করুন',
    authTitleRegister: 'Roktobondhu Bangladesh-এ যোগ দিন',
    authTitleReset: 'পাসওয়ার্ড রিসেট',
    authTitleNewPassword: 'নতুন পাসওয়ার্ড দিন',
    authTitleLogin: 'আবারও স্বাগতম',
    authSubRegister: 'ভেরিফায়েড রক্তদাতা হিসেবে নিবন্ধন করুন',
    authSubReset: 'পাসওয়ার্ড রিসেটের নির্দেশনা পেতে আপনার ইমেইল দিন',
    authSubNewPassword: 'আপনার Roktobondhu Bangladesh অ্যাকাউন্টের নতুন পাসওয়ার্ড দিন',
    authSubLogin: 'আপনার Roktobondhu Bangladesh অ্যাকাউন্টে সাইন ইন করুন',
    errInvalidEmail: 'ইমেইলটা ঠিক নেই। যেমন: name@example.com',
    errPasswordLength: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।',
    errPasswordWeak: 'আরেকটু শক্ত পাসওয়ার্ড দিন: বড় হাতের ও ছোট হাতের অক্ষর, সংখ্যা আর একটা চিহ্ন মিলিয়ে (যেমন: Milad@2420)।',
    errPasswordCommon: 'এই পাসওয়ার্ডটা খুব কমন, সহজে আন্দাজ করা যায়। অন্য একটা দিন।',
    errPasswordRejected: 'এই পাসওয়ার্ডটা নেওয়া যাচ্ছে না। অন্য একটা দিন।',
    confirmDiscard: 'ফর্মটা বন্ধ করবেন? যা লিখেছেন সব মুছে যাবে।',
    resetLinkSent: 'এই ইমেইল নিবন্ধিত থাকলে একটি রিসেট লিংক পাঠানো হয়েছে। ইনবক্স ও স্প্যাম ফোল্ডার দেখুন, আর ইমেইলের বানান ঠিক আছে কিনা মিলিয়ে নিন।',
    errGeneric: 'কোনো সমস্যা হয়েছে। আবার চেষ্টা করুন।',
    errInvalidLogin: 'ইমেইল বা পাসওয়ার্ড মিলছে না। আবার দেখে দিন।',
    errEmailRequired: 'ইমেইল লিখুন।',
    errPasswordRequired: 'পাসওয়ার্ড লিখুন।',
    errPhoneRequired: 'মোবাইল নম্বর লিখুন।',
    errPhoneInvalid: '১১ ডিজিটের সঠিক মোবাইল নম্বর দিন। যেমন: 01712345678',
    errAreaRequired: 'আপনার এলাকা বেছে নিন।',
    errBirthYear: '{year} সালের মধ্যে, ১৯০০ এর পরের সাল লিখুন।',
    errAlreadyRegistered: 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে। সাইন ইন করুন।',
    alreadyRegisteredTitle: 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে',
    alreadyRegisteredBody: 'সাইন ইন করুন, অথবা অন্য ইমেইল দিয়ে নতুন অ্যাকাউন্ট খুলুন।',
    signInInstead: 'সাইন ইন করুন',
    useNewEmail: 'অন্য ইমেইল দিন',
    errEmailNotConfirmed: 'ইমেইল এখনো কনফার্ম হয়নি। ইনবক্সে পাঠানো লিংকে ক্লিক করুন।',
    msgConfirmEmail: 'প্রায় শেষ! আপনার ইমেইলে একটা লিংক পাঠানো হয়েছে। ওটাতে ক্লিক করে সাইন ইন করুন।',
    errRateLimit: 'অনেকবার চেষ্টা হয়েছে। কয়েক মিনিট পরে আবার চেষ্টা করুন।',
    errSamePassword: 'নতুন পাসওয়ার্ড আগেরটার থেকে আলাদা হতে হবে।',
    errSessionExpired: 'সেশন শেষ হয়ে গেছে। পেজ রিফ্রেশ করে আবার সাইন ইন করুন।',
    errNetwork: 'ইন্টারনেট সংযোগে সমস্যা। একটু পরে আবার চেষ্টা করুন।',
    errEmailInvalidServer: 'ইমেইলটা ঠিক নেই। আবার দেখে দিন।',
    errMagicLinkNeedsEmail: 'লিংক পেতে আগে উপরে আপনার ইমেইল লিখুন।',
    errFixFieldsOne: 'একটা ঘরে ভুল আছে। দেখতে এখানে চাপুন।',
    errFixFieldsMany: '{count}টা ঘরে ভুল আছে। দেখতে এখানে চাপুন।',
    fullNamePlaceholder: 'যেমন: রহিম উদ্দিন',
    email: 'ইমেইল',
    password: 'পাসওয়ার্ড',
    passwordPlaceholder: 'কমপক্ষে ৬ অক্ষর',
    hidePassword: 'পাসওয়ার্ড লুকান',
    showPassword: 'পাসওয়ার্ড দেখুন',
    forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
    errMagicLinkEmail: 'ইমেইল লিংক চাওয়ার আগে সঠিক ইমেইল ঠিকানা দিন।',
    magicLinkSent: 'আপনার ইমেইলে সাইন ইন লিংক পাঠানো হয়েছে। ইনবক্স দেখুন।',
    loginWithEmailLink: 'ইমেইল লিংকে সাইন ইন',
    pleaseWait: 'অপেক্ষা করুন...',
    createSecureProfile: 'প্রোফাইল তৈরি করুন',
    sendResetEmail: 'রিসেট ইমেইল পাঠান',
    updatePassword: 'পাসওয়ার্ড আপডেট করুন',
    signIn: 'সাইন ইন',
    or: 'অথবা',
    continueWithGoogle: 'Google দিয়ে চালিয়ে যান',
    switchToLogin: 'আগেই নিবন্ধন করেছেন? সাইন ইন করুন',
    switchToRegister: 'নতুন রক্তদাতা? ফ্রি প্রোফাইল তৈরি করুন',

    // 3. Profile modal
    closeProfileDialog: 'প্রোফাইল বন্ধ করুন',
    bloodGroupValue: 'ব্লাড গ্রুপ: {group}',
    ageSuffix: ' · {age} বছর',
    errSessionRefresh: 'আপনার সেশন রিফ্রেশ করা দরকার। পেজটি রিলোড করে আবার চেষ্টা করুন।',
    errProfileUpdate: 'প্রোফাইল আপডেট করা যায়নি। আবার চেষ্টা করুন।',
    phoneCaps: 'ফোন নম্বর',
    whatsappCaps: 'WhatsApp',
    notProvided: 'দেওয়া হয়নি',
    notAvailableRightNow: 'এখন দিতে পারবেন না',
    hiddenUntilRevealed: 'লুকানো আছে',
    contactChecked: 'যোগাযোগ দেখা হয়েছে',
    checkingAvailability: 'যাচাই করা হচ্ছে...',
    showNumber: 'নম্বর দেখুন',
    healthTelemetry: 'DGHS স্বাস্থ্য তথ্য',
    hemoglobin: 'হিমোগ্লোবিন',
    bloodPressure: 'রক্তচাপ',
    weight: 'ওজন',
    weightValue: '{weight} কেজি',
    notAvailable: 'তথ্য নেই',
    donationRecord: 'রক্তদানের রেকর্ড',
    timesDonated: 'মোট রক্তদান',
    lastDonated: 'শেষ রক্তদান',
    nextEligible: 'আবার দিতে পারবেন',
    never: 'কখনো না',
    now: 'এখনই',
    ttiScreening: 'বাধ্যতামূলক TTI স্ক্রিনিং',
    syphilis: 'সিফিলিস',
    malaria: 'ম্যালেরিয়া',
    statusNotTested: 'পরীক্ষা হয়নি',
    statusNegative: 'নেগেটিভ',
    statusPositive: 'পজিটিভ',
    smokingStatus: 'ধূমপান:',
    smoker: 'ধূমপায়ী',
    nonSmoker: 'অধূমপায়ী',
    regularDonor: 'নিয়মিত দাতা:',
    regularYes: 'হ্যাঁ (৩+ বার)',
    regularNew: 'নতুন',
    healthPrivate: 'স্বাস্থ্য ও স্ক্রিনিংয়ের আলাদা ফলাফল গোপন থাকে। শুধু সম্মতি দিলে স্ক্রিনিং সম্পন্নের badge দেখা যায়।',
    screeningCompletionPublic: 'দাতার দেওয়া তথ্য অনুযায়ী স্ক্রিনিং সম্পন্ন',
    shareScreeningCompletion: 'স্ক্রিনিং সম্পন্ন badge অন্যদের দেখান',
    shareScreeningCompletionHelp: 'পাঁচটি ফলাফল নেগেটিভ হিসেবে নথিভুক্ত হলেই শুধু completion badge দেখা যাবে। আলাদা কোনো ফলাফল প্রকাশ হবে না; এটি স্বাধীন চিকিৎসা যাচাই নয়।',
    screeningFeatureUnavailable: 'স্ক্রিনিং সম্পন্নের public badge এখনো চালু হয়নি।',
    editProfile: 'প্রোফাইল এডিট করুন',
    phone: 'ফোন নম্বর',
    lastDonationDate: 'শেষ রক্তদানের তারিখ',
    screeningEntered: 'আপনার দেওয়া স্ক্রিনিং ফলাফল',
    testHbsag: 'HBsAg (হেপাটাইটিস বি)',
    testHcv: 'Anti-HCV (হেপাটাইটিস সি)',
    testHiv: 'Anti-HIV',
    testVdrl: 'VDRL (সিফিলিস)',
    testMp: 'MP টেস্ট (ম্যালেরিয়া)',
    cancel: 'বাতিল',
    availabilityStatus: 'আপনার বর্তমান অবস্থা',
    broadcastingAvailable: 'জরুরি প্রয়োজনে রক্ত দিতে প্রস্তুত হিসেবে দেখানো হচ্ছে',
    restingOffDuty: 'বিশ্রামে আছেন (এখন দিতে পারবেন না)',
    availableNowButton: 'এখন দিতে পারবেন',
    offDutyButton: 'বিশ্রামে',
    notYetVisibleHint: 'অন্যরা আপনাকে এখনো "এখন দিতে পারবেন না" দেখছেন — আপনার পরবর্তী যোগ্যতার তারিখ {date} পর্যন্ত।',
    whatsappMessage: 'WhatsApp মেসেজ',
    showNumberFirst: 'আগে নম্বর দেখুন',
    call: 'কল করুন',

    // 4. Notifications modal
    notificationsTitle: 'নোটিফিকেশন',
    markAllRead: 'সব পড়া হয়েছে',
    closeNotificationsDialog: 'নোটিফিকেশন বন্ধ করুন',
    noNotifications: 'এখনো কোনো নোটিফিকেশন নেই।',
    viewDonorProfile: 'রক্তদাতার প্রোফাইল দেখুন',
    openRequestsToConfirm: 'নিশ্চিত করতে অনুরোধগুলো খুলুন',

    // 5. Complete profile modal
    completeTitle: 'শেষ একটি ধাপ',
    completeSubtitle: 'রক্তদাতা প্রোফাইল সম্পূর্ণ করতে কয়েকটি প্রয়োজনীয় তথ্য দিন',
    errEnterPhone: 'আপনার ফোন নম্বর দিন।',
    errSaveProfile: 'প্রোফাইল সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
    finishSetup: 'প্রোফাইল সম্পূর্ণ করুন'
  }
);

/* ================= 1. REQUEST BLOOD MODAL ================= */
interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: Partial<EmergencyRequest>) => Promise<boolean>;
  /** When set, the modal edits this request instead of creating a new one. */
  editingRequest?: EmergencyRequest | null;
}

function getDefaultNeededByTime(): string {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 2);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function formatNeededByTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getDefaultNeededByTime();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

export const RequestBloodModal: React.FC<RequestModalProps> = ({ isOpen, onClose, onSubmit, editingRequest = null }) => {
  const districts = useDistricts();
  const { s } = useStrings(S);
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('35');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O-');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('Banani');
  const [hospitalName, setHospitalName] = useState('');
  const [bags, setBags] = useState('2');
  const [neededBy, setNeededBy] = useState(getDefaultNeededByTime);
  const [urgency, setUrgency] = useState<'Critical' | 'High' | 'Medium'>('Critical');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isEditMode = !!editingRequest;


  // Tracks whether the user has typed anything, so a stray back / Escape /
  // backdrop click asks before throwing the input away.
  const [dirty, setDirty] = useState(false);
  React.useEffect(() => { setDirty(false); }, [isOpen]);
  const requestClose = useDismissable(isOpen, onClose, dirty ? s.confirmDiscard : null);

  React.useEffect(() => {
    if (!isOpen) return;
    setSubmitError('');
    if (editingRequest) {
      setPatientName(editingRequest.patientName || '');
      setAge(String(editingRequest.age ?? 35));
      setBloodGroup(editingRequest.bloodGroup);
      setDistrict(editingRequest.district || 'Dhaka');
      setArea(editingRequest.area || '');
      setHospitalName(editingRequest.hospitalName || '');
      setBags(String(editingRequest.requiredBags ?? 1));
      setNeededBy(toDateTimeLocal(editingRequest.neededByAt || editingRequest.neededByTime || ''));
      setUrgency(editingRequest.urgency);
      setPhone(editingRequest.contactPhone || '');
      setWhatsapp(editingRequest.contactWhatsapp || '');
      setReason(editingRequest.reason || '');
    } else {
      setPatientName('');
      setAge('35');
      setHospitalName('');
      setPhone('');
      setWhatsapp('');
      setReason('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingRequest?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !hospitalName || !phone) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const saved = await onSubmit({
        id: editingRequest?.id || `req-${Date.now()}`,
        patientName,
        age: Number(age) || 30,
        bloodGroup,
        hospitalName,
        district,
        area,
        requiredBags: Number(bags) || 1,
        neededByTime: formatNeededByTime(neededBy),
        neededByAt: new Date(neededBy).toISOString(),
        urgency,
        contactPhone: toBdDialing(phone),
        contactWhatsapp: toBdWhatsapp(whatsappSameAsPhone ? phone : whatsapp),
        reason: reason || 'Urgent medical transfusion requirement.',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        matchedDonorsCount: 0
      });
      if (!saved) setSubmitError(isEditMode ? s.errRequestUpdate : s.errRequestSave);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDistObj = districts.find(d => d.name === district);
  const areasList = selectedDistObj ? selectedDistObj.areas : [];

  return (
    <div onClick={backdropClose(requestClose)} className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 lg:p-10 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scroll my-auto">
        <button onClick={onClose} aria-label={s.closeRequestDialog} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center animate-pulse shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="editorial-title text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">{isEditMode ? s.requestTitleEdit : s.requestTitleNew}</h2>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{isEditMode ? s.requestSubtitleEdit : s.requestSubtitleNew}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} onChange={() => setDirty(true)} className="space-y-4">
          {submitError && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-400">
              {submitError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="request-patient-name" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.patientFullName} <span className="text-rose-600 dark:text-rose-400">*</span></label>
              <input id="request-patient-name" name="patientName" required value={patientName} onChange={e => setPatientName(e.target.value)} placeholder={s.patientNamePlaceholder} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="request-age" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.age} <span className="text-rose-600 dark:text-rose-400">*</span></label>
                <input id="request-age" name="age" required type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label htmlFor="request-blood-group" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.bloodGroup} <span className="text-rose-600 dark:text-rose-400">*</span></label>
                <select id="request-blood-group" name="bloodGroup" value={bloodGroup} onChange={e => setBloodGroup(e.target.value as BloodGroup)} className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="request-hospital" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.hospitalName} <span className="text-rose-600 dark:text-rose-400">*</span></label>
              <input id="request-hospital" name="hospitalName" required value={hospitalName} onChange={e => setHospitalName(e.target.value)} placeholder={s.hospitalPlaceholder} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="request-district" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.district} <span className="text-rose-600 dark:text-rose-400">*</span></label>
                <CompactSelect
                  value={district}
                  onChange={value => { setDistrict(value); setArea(districts.find(d => d.name === value)?.areas[0] || ''); }}
                  options={districts.map(d => ({ value: d.name, label: d.name }))}
                  id="request-district"
                  className="text-sm"
                />
              </div>
              <div>
                <label htmlFor="request-area" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.area} <span className="text-rose-600 dark:text-rose-400">*</span></label>
                <AreaField id="request-area" name="area" areas={areasList} value={area} onChange={setArea} className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="request-bags" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.requiredBags} <span className="text-rose-600 dark:text-rose-400">*</span></label>
              <input id="request-bags" name="requiredBags" type="number" min="1" max="10" value={bags} onChange={e => setBags(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label htmlFor="request-needed-by" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.neededByTime} <span className="text-rose-600 dark:text-rose-400">*</span></label>
              <input id="request-needed-by" name="neededBy" required type="datetime-local" value={neededBy} onChange={e => setNeededBy(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label htmlFor="request-urgency" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.urgencyPriority} <span className="text-rose-600 dark:text-rose-400">*</span></label>
              <select id="request-urgency" name="urgency" value={urgency} onChange={e => setUrgency(e.target.value as any)} className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100">
                <option value="Critical">🚨 {s.urgencyCritical}</option>
                <option value="High">⚠️ {s.urgencyHigh}</option>
                <option value="Medium">ℹ️ {s.urgencyMedium}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="request-phone" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.contactPhone} <span className="text-rose-600 dark:text-rose-400">*</span></label>
              <input
                required
                id="request-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="01712345678"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100"
              />
              <p className="mt-1 text-[11px] text-slate-500">আপনার নম্বর যেভাবে লেখেন সেভাবেই দিন — ০ দিয়ে শুরু।</p>
            </div>
            <div>
              <label htmlFor="request-whatsapp" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.whatsappNumber} <span className="normal-case font-medium text-slate-400">{s.optional}</span></label>
              <input
                value={whatsappSameAsPhone ? phone : whatsapp}
                id="request-whatsapp"
                name="whatsapp"
                onChange={e => setWhatsapp(e.target.value)}
                disabled={whatsappSameAsPhone}
                inputMode="numeric"
                placeholder="01712345678"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 disabled:opacity-60"
              />
              <label className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsappSameAsPhone}
                  onChange={e => setWhatsappSameAsPhone(e.target.checked)}
                  className="accent-rose-600"
                />
                ফোন নম্বরেই WhatsApp আছে
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="request-reason" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.reasonLabel} <span className="normal-case font-medium text-slate-400">{s.optional}</span></label>
            <textarea id="request-reason" name="reason" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder={s.reasonPlaceholder} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100" />
          </div>

          <button type="submit" disabled={submitting} className="w-full py-4 blood-gradient text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl cursor-pointer mt-2 disabled:cursor-wait disabled:opacity-60">
            {submitting ? s.saving : (isEditMode ? `💾 ${s.saveChanges}` : `🚨 ${s.broadcastRequest}`)}
          </button>
        </form>
      </div>
    </div>
  );
};


/* ================= 2. AUTH REGISTRATION / LOGIN MODAL ================= */
type AuthField = 'name' | 'email' | 'password' | 'phone' | 'bloodGroup' | 'area' | 'birthYear';
type AuthFieldErrors = Partial<Record<AuthField, string>>;
const AUTH_FIELD_ORDER: AuthField[] = ['name', 'email', 'password', 'phone', 'bloodGroup', 'area', 'birthYear'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthStrings = (typeof S)['en'];

/**
 * Auth/server errors arrive in English. Turn the known ones into the current
 * UI language and say which field they belong to; unknown ones fall back to a
 * generic line instead of showing raw server text.
 */
function describeAuthError(message: string, s: AuthStrings): { field: AuthField | null; text: string } {
  const m = message.toLowerCase();
  if (m.includes('already registered')) return { field: null, text: s.errAlreadyRegistered };
  if (m.includes('invalid login') || m.includes('invalid email or password') || m.includes('invalid credentials')) return { field: null, text: s.errInvalidLogin };
  if (m.includes('email not confirmed')) return { field: null, text: s.errEmailNotConfirmed };
  if (m.includes('confirmation link') || m.includes('registration received')) return { field: null, text: s.msgConfirmEmail };
  if (m.includes('rate limit') || m.includes('too many')) return { field: null, text: s.errRateLimit };
  if (m.includes('should be different') || m.includes('same password')) return { field: 'password', text: s.errSamePassword };
  // Only claim "too short" when the server actually says so: Supabase also
  // rejects passwords for strength rules ("should contain at least one
  // character of each...") and leaked/weak passwords, which are a different fix.
  if (m.includes('password') && (m.includes('should contain') || m.includes('one character of each'))) return { field: 'password', text: s.errPasswordWeak };
  if (m.includes('password') && (m.includes('weak') || m.includes('easy to guess') || m.includes('pwned') || m.includes('leaked'))) return { field: 'password', text: s.errPasswordCommon };
  if (m.includes('password') && m.includes('at least') && m.includes('character')) return { field: 'password', text: s.errPasswordLength };
  if (m.includes('password')) return { field: 'password', text: s.errPasswordRejected };
  if (m.includes('email')) return { field: 'email', text: s.errEmailInvalidServer };
  if (m.includes('session') || m.includes('refresh')) return { field: null, text: s.errSessionExpired };
  if (m.includes('network') || m.includes('fetch') || m.includes('not configured') || m.includes('not connected')) return { field: null, text: s.errNetwork };
  return { field: null, text: s.errGeneric };
}

/** Scroll the first invalid field (ids are `${prefix}-${field}`) into view and focus it. */
function focusFirstFieldError(prefix: string, errors: AuthFieldErrors) {
  const first = AUTH_FIELD_ORDER.find(f => errors[f]);
  if (!first) return;
  requestAnimationFrame(() => {
    const el = document.getElementById(`${prefix}-${first}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus({ preventScroll: true });
  });
}

/**
 * Shown right above the submit button whenever a field has an error. On phones
 * the invalid field is often scrolled off-screen, so without this the button
 * seems to do nothing. Tapping it jumps to the first problem.
 */
const FieldErrorSummary: React.FC<{ prefix: string; errors: AuthFieldErrors; one: string; many: string; lang: Lang }> = ({ prefix, errors, one, many, lang }) => {
  const count = AUTH_FIELD_ORDER.filter(f => errors[f]).length;
  if (count === 0) return null;
  return (
    <button
      type="button"
      role="alert"
      onClick={() => focusFirstFieldError(prefix, errors)}
      className="mt-4 w-full flex items-start gap-2 p-3 text-left bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400"
    >
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{count === 1 ? one : fmt(many, { count }, lang)}</span>
    </button>
  );
};

const authInputClass = (hasError: boolean) =>
  `w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-semibold ${hasError ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'}`;

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
      <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />
      <span>{message}</span>
    </p>
  ) : null;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: DonorProfile) => void;
  passwordRecovery?: boolean;
  onPasswordRecoveryComplete?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, passwordRecovery = false, onPasswordRecoveryComplete }) => {
  const districts = useDistricts();
  const { s, lang } = useStrings(S);
  const [view, setView] = useState<'login' | 'register' | 'reset' | 'new-password'>(passwordRecovery ? 'new-password' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [birthYear, setBirthYear] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('Banani');
  const [isSmoker, setIsSmoker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [successMsg, setSuccessMsg] = useState('');
  // Signup hit an existing account: shown as a friendly notice, not an error.
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const clearFieldError = (field: AuthField) =>
    setFieldErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const switchView = (next: 'login' | 'register' | 'reset' | 'new-password') => {
    setView(next);
    setErrorMsg('');
    setFieldErrors({});
    setSuccessMsg('');
    setAlreadyRegistered(false);
  };

  const showFieldErrors = (errors: AuthFieldErrors) => {
    setFieldErrors(errors);
    // Bring the first problem into view; on phones it can be off-screen.
    focusFirstFieldError('auth', errors);
  };

  /** Show a server error beside its field when we can tell which one it is about. */
  const showServerError = (message: string) => {
    const { field, text } = describeAuthError(message, s);
    if (field && !(field === 'email' && view === 'new-password')) {
      showFieldErrors({ [field]: text });
    } else {
      setErrorMsg(text);
    }
  };

  const validate = (normalizedEmail: string): AuthFieldErrors => {
    const errors: AuthFieldErrors = {};
    if (view === 'register' && !isValidDonorName(name)) errors.name = s.errNameSymbols;
    if (view !== 'new-password') {
      if (!normalizedEmail) errors.email = s.errEmailRequired;
      else if (!EMAIL_PATTERN.test(normalizedEmail)) errors.email = s.errInvalidEmail;
    }
    if (view !== 'reset') {
      if (!password) errors.password = s.errPasswordRequired;
      else if (view !== 'login' && password.length < 6) errors.password = s.errPasswordLength;
    }
    if (view === 'register') {
      if (!phone.trim()) errors.phone = s.errPhoneRequired;
      else if (!isValidBdMobile(phone)) errors.phone = s.errPhoneInvalid;
      if (!bloodGroup) errors.bloodGroup = s.errSelectBloodGroup;
      if (!area.trim()) errors.area = s.errAreaRequired;
      if (birthYear) {
        const year = Number(birthYear);
        const thisYear = new Date().getFullYear();
        if (!Number.isInteger(year) || year < 1900 || year > thisYear) errors.birthYear = fmt(s.errBirthYear, { year: thisYear }, lang);
      }
    }
    return errors;
  };

  React.useEffect(() => {
    setView(passwordRecovery ? 'new-password' : 'login');
    setFieldErrors({});
    setErrorMsg('');
    setSuccessMsg('');
  }, [passwordRecovery]);

  React.useEffect(() => {
    if (isOpen) {
      setView(passwordRecovery ? 'new-password' : 'login');
      setErrorMsg('');
      setFieldErrors({});
      setSuccessMsg('');
      setPassword('');
      setAlreadyRegistered(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Tracks whether the user has typed anything, so a stray back / Escape /
  // backdrop click asks before throwing the input away.
  const [dirty, setDirty] = useState(false);
  React.useEffect(() => { setDirty(false); }, [isOpen, view]);
  // Only the signup form has enough typed input to be worth protecting.
  const requestClose = useDismissable(isOpen && !passwordRecovery, onClose, view === 'register' && dirty ? s.confirmDiscard : null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    setAlreadyRegistered(false);
    const normalizedEmail = email.trim().toLowerCase();
    const errors = validate(normalizedEmail);
    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);

    if (view === 'new-password') {
      const error = await updatePassword(password);
      if (error) {
        showServerError(error);
        setLoading(false);
        return;
      }

      // A recovery session is only for changing the password. End it afterward
      // so the user must sign in again with the new password.
      await signOutDonor();
      setLoading(false);
      onPasswordRecoveryComplete?.();
      onClose();
      return;
    }

    if (view === 'reset') {
      const { error } = await sendPasswordResetEmail(normalizedEmail);
      setLoading(false);
      if (error) {
        showServerError(error);
        return;
      }
      setSuccessMsg(s.resetLinkSent);
      return;
    }

    if (view === 'register') {
      const { user, error } = await signUpDonor({
        name: name || 'New Donor',
        email: normalizedEmail,
        password,
        phone: toBdDialing(phone),
        bloodGroup,
        birthYear: birthYear ? Number(birthYear) : null,
        district,
        area,
        isSmoker
      });
      setLoading(false);
      if (error || !user) {
        if (error?.toLowerCase().includes('already registered')) {
          // Stay on the signup form (no surprise page switch) and show the
          // notice under the email field with clear next steps.
          setAlreadyRegistered(true);
          requestAnimationFrame(() => document.getElementById('auth-email-notice')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
          return;
        }
        if (error && /confirmation link|registration received/i.test(error)) {
          // Not a failure: signup worked, the email just needs confirming.
          setSuccessMsg(s.msgConfirmEmail);
          return;
        }
        showServerError(error || 'unknown');
        return;
      }
      onLoginSuccess(user);
      onClose();
      return;
    }

    const { user, error } = await signInDonor(normalizedEmail, password);
    setLoading(false);
    if (error || !user) {
      setErrorMsg(error ? describeAuthError(error, s).text : s.errInvalidLogin);
      return;
    }
    onLoginSuccess(user);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    // Full-page redirect to Google; this modal (and the whole app) unmounts
    // here. The session is picked up on return by subscribeToAuthState in
    // App.tsx, same as magic-link and password-reset already work.
    const { error } = await signInWithGoogle();
    if (error) {
      setLoading(false);
      setErrorMsg(describeAuthError(error, s).text);
    }
  };

  return (
    <div onClick={backdropClose(requestClose)} className="fixed inset-0 z-50 glass-dark flex items-stretch sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      {/* Full screen on phones so the form scrolls as one page and errors stay in view. */}
      <div className="bg-white dark:bg-slate-900 sm:rounded-[2.5rem] px-5 pt-16 pb-8 sm:p-8 lg:p-10 w-full h-[100dvh] sm:h-auto sm:max-w-md sm:max-h-[90vh] overflow-y-auto sm:border border-slate-200 dark:border-slate-800 shadow-2xl relative text-slate-900 dark:text-slate-100">
        <button onClick={onClose} aria-label={s.closeAuthDialog} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400">
          <X className="w-5 h-5" />
        </button>

        <img src="/logo-mark.svg" alt="RBB — Roktobondhu Bangladesh" className="w-12 h-12 rounded-2xl shadow-lg shadow-rose-500/20 mb-4" />

        <h2 className="editorial-title text-3xl font-black">
          {view === 'register' ? s.authTitleRegister : view === 'reset' ? s.authTitleReset : view === 'new-password' ? s.authTitleNewPassword : s.authTitleLogin}
        </h2>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1 mb-6">
          {view === 'register'
            ? s.authSubRegister
            : view === 'reset'
            ? s.authSubReset
            : view === 'new-password'
            ? s.authSubNewPassword
            : s.authSubLogin}
        </p>

        <form onSubmit={handleSubmit} onChange={() => setDirty(true)} noValidate className="space-y-3.5">
          {view === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.fullName} <span className="text-rose-600 dark:text-rose-400">*</span></label>
              <input id="auth-name" name="name" autoComplete="name" value={name} onChange={e => { setName(e.target.value); clearFieldError('name'); }} placeholder={s.fullNamePlaceholder} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'auth-name-error' : undefined} className={authInputClass(!!fieldErrors.name)} />
              <FieldError id="auth-name-error" message={fieldErrors.name} />
            </div>
          )}

          {view !== 'new-password' && <div>
            <label htmlFor="auth-email" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.email} <span className="text-rose-600 dark:text-rose-400">*</span></label>
            <input id="auth-email" type="email" name="email" autoComplete={view === 'login' ? 'username' : 'email'} value={email} onChange={e => { setEmail(e.target.value); clearFieldError('email'); setAlreadyRegistered(false); }} placeholder="you@example.com" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'auth-email-error' : alreadyRegistered ? 'auth-email-notice' : undefined} className={authInputClass(!!fieldErrors.email)} />
            <FieldError id="auth-email-error" message={fieldErrors.email} />
            {alreadyRegistered && view === 'register' && (
              <div id="auth-email-notice" role="status" className="mt-2 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/30 p-4 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50">
                    <User className="h-4 w-4 text-sky-700 dark:text-sky-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.alreadyRegisteredTitle}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{s.alreadyRegisteredBody}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="rounded-xl bg-sky-600 hover:bg-sky-700 px-3 py-2.5 text-xs font-bold text-white transition-colors"
                  >
                    {s.signInInstead}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAlreadyRegistered(false);
                      setEmail('');
                      requestAnimationFrame(() => document.getElementById('auth-email')?.focus());
                    }}
                    className="rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {s.useNewEmail}
                  </button>
                </div>
                <button type="button" onClick={() => switchView('reset')} className="mt-2.5 w-full text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:underline">
                  {s.forgotPassword}
                </button>
              </div>
            )}
          </div>}

          {view !== 'reset' && (
            <div>
              <label htmlFor="auth-password" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.password} <span className="text-rose-600 dark:text-rose-400">*</span></label>
              <div className="relative">
                <input id="auth-password" type={showPassword ? 'text' : 'password'} name="password" autoComplete={view === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => { setPassword(e.target.value); clearFieldError('password'); }} placeholder={s.passwordPlaceholder} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined} className={`${authInputClass(!!fieldErrors.password)} pr-11`} />
                <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300" aria-label={showPassword ? s.hidePassword : s.showPassword} tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <FieldError id="auth-password-error" message={fieldErrors.password} />
            </div>
          )}

          {view === 'login' && (
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <button type="button" onClick={() => switchView('reset')} className="text-rose-600 dark:text-rose-400 hover:underline">
                {s.forgotPassword}
              </button>
              <button type="button" onClick={async () => {
                setErrorMsg('');
                setSuccessMsg('');
                const normalizedEmail = email.trim().toLowerCase();
                if (!EMAIL_PATTERN.test(normalizedEmail)) {
                  showFieldErrors({ email: s.errMagicLinkNeedsEmail });
                  return;
                }
                setLoading(true);
                const { error } = await sendMagicLink(normalizedEmail);
                setLoading(false);
                if (error) {
                  showServerError(error);
                } else {
                  setSuccessMsg(s.magicLinkSent);
                }
              }} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                {s.loginWithEmailLink}
              </button>
            </div>
          )}

          {view === 'register' && (
            <>
              <div>
                <label htmlFor="auth-phone" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.phoneNumber} <span className="text-rose-600 dark:text-rose-400">*</span></label>
                <input id="auth-phone" name="phone" type="tel" autoComplete="tel" value={phone} onChange={e => { setPhone(e.target.value); clearFieldError('phone'); }} inputMode="numeric" placeholder="01712345678" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'auth-phone-error' : undefined} className={authInputClass(!!fieldErrors.phone)} />
                <FieldError id="auth-phone-error" message={fieldErrors.phone} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.bloodGroup} <span className="text-rose-600 dark:text-rose-400">*</span></label>
                  <select id="auth-bloodGroup" value={bloodGroup} onChange={e => { setBloodGroup(e.target.value); clearFieldError('bloodGroup'); }} aria-invalid={!!fieldErrors.bloodGroup} aria-describedby={fieldErrors.bloodGroup ? 'auth-bloodGroup-error' : undefined} className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono font-bold text-rose-600 dark:text-rose-400 ${fieldErrors.bloodGroup ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}>
                    <option value="" disabled>{s.selectBloodGroup}</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                  <FieldError id="auth-bloodGroup-error" message={fieldErrors.bloodGroup} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.district} <span className="text-rose-600 dark:text-rose-400">*</span></label>
                  <select value={district} onChange={e => { setDistrict(e.target.value); setArea(districts.find(d => d.name === e.target.value)?.areas[0] || ''); }} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold">
                    {districts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.area} <span className="text-rose-600 dark:text-rose-400">*</span></label>
                <AreaField id="auth-area" areas={districts.find(d => d.name === district)?.areas || []} value={area} onChange={value => { setArea(value); clearFieldError('area'); }} className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold ${fieldErrors.area ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'}`} />
                <FieldError id="auth-area-error" message={fieldErrors.area} />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.birthYear} <span className="normal-case font-medium text-slate-400">{s.optional}</span></label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={new Date().getFullYear()}
                  id="auth-birthYear"
                  value={birthYear}
                  onChange={e => { setBirthYear(e.target.value); clearFieldError('birthYear'); }}
                  placeholder={s.birthYearPlaceholder}
                  aria-invalid={!!fieldErrors.birthYear}
                  aria-describedby={fieldErrors.birthYear ? 'auth-birthYear-error' : undefined}
                  className={authInputClass(!!fieldErrors.birthYear)}
                />
                <FieldError id="auth-birthYear-error" message={fieldErrors.birthYear} />
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
                <input type="checkbox" checked={isSmoker} onChange={e => setIsSmoker(e.target.checked)} className="accent-rose-600 w-4 h-4" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.smokerCheckbox}</span>
              </label>
            </>
          )}

          {errorMsg && (
            <div role="alert" className="mt-4 flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <FieldErrorSummary prefix="auth" errors={fieldErrors} one={s.errFixFieldsOne} many={s.errFixFieldsMany} lang={lang} />

          <button type="submit" disabled={loading} className="w-full py-4 blood-gradient text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl cursor-pointer mt-4 disabled:opacity-60">
            {loading ? s.pleaseWait : view === 'register' ? s.createSecureProfile : view === 'reset' ? s.sendResetEmail : view === 'new-password' ? s.updatePassword : s.signIn}
          </button>

          {(view === 'login' || view === 'register') && (
            <>
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.or}</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.28 1.48-1.13 2.73-2.4 3.58v2.98h3.89c2.28-2.1 3.53-5.19 3.53-8.8z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.89-2.98c-1.08.72-2.45 1.16-4.04 1.16-3.1 0-5.73-2.09-6.67-4.9H1.32v3.07C3.29 21.3 7.31 24 12 24z" />
                  <path fill="#FBBC05" d="M5.33 14.38c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.75H1.32C.48 8.4 0 10.15 0 12s.48 3.6 1.32 5.25l4.01-3.12z" />
                  <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.29 2.7 1.32 6.75l4.01 3.09c.94-2.81 3.57-5.09 6.67-5.09z" />
                </svg>
                {s.continueWithGoogle}
              </button>
            </>
          )}

          {successMsg && (
            <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              {successMsg}
            </div>
          )}

          <button
            type="button"
            onClick={() => switchView(view === 'register' ? 'login' : 'register')}
            className="w-full text-center py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer block"
          >
            {view === 'register' ? s.switchToLogin : s.switchToRegister}
          </button>
        </form>
      </div>
    </div>
  );
};


/* ================= 3. DONOR PROFILE / SCREENING MODAL ================= */
interface ProfileModalProps {
  donor: DonorProfile | null;
  isOwnProfile: boolean;
  currentUserId: string | null;
  screeningBadgeFeatureAvailable: boolean;
  onClose: () => void;
  onToggleAvailability?: () => void;
  onProfileUpdated?: (updated: DonorProfile) => void;
  onRequireAuth: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ donor, isOwnProfile, currentUserId, screeningBadgeFeatureAvailable, onClose, onToggleAvailability, onProfileUpdated, onRequireAuth }) => {
  const districts = useDistricts();
  const { s, f, lang } = useStrings(S);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [birthYear, setBirthYear] = useState('');
  const [district, setDistrict] = useState('');
  const [area, setArea] = useState('');
  const [lastDonationDate, setLastDonationDate] = useState('');
  const [hbsagStatus, setHbsagStatus] = useState('Not Tested');
  const [hcvStatus, setHcvStatus] = useState('Not Tested');
  const [hivStatus, setHivStatus] = useState('Not Tested');
  const [syphilisStatus, setSyphilisStatus] = useState('Not Tested');
  const [malariaStatus, setMalariaStatus] = useState('Not Tested');
  const [shareScreeningCompletion, setShareScreeningCompletion] = useState(false);
  const [revealedContact, setRevealedContact] = useState<{ phone: string | null; whatsapp: string | null } | null>(null);
  const [revealingContact, setRevealingContact] = useState(false);
  const isMountedRef = React.useRef(true);
  // Bumped whenever the donor being viewed changes, so a reveal request for
  // donor A that resolves after switching to donor B doesn't paint A's
  // number under B's name -- ProfileModal is a single persistent instance
  // reused across different donors, not remounted per profile.
  const revealVersionRef = React.useRef(0);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Same reset DonorsNetwork.tsx's revealedContacts already does on
  // currentUserId change -- ProfileModal is a single persistent instance that
  // doesn't remount or change its `donor` prop on sign-out, so without this,
  // a contact revealed before logout stays rendered after it. Keyed
  // separately from the [donor] effect below so it also fires when the same
  // donor's modal is left open across a login/logout transition.
  React.useEffect(() => {
    revealVersionRef.current += 1;
    setRevealedContact(null);
    setRevealingContact(false);
  }, [currentUserId]);

  React.useEffect(() => {
    // Reset to view mode every time this opens for a donor — otherwise
    // closing via the X/backdrop while mid-edit (skipping Save/Cancel, which
    // are the only places that reset it) leaves isEditing stuck true, so
    // reopening jumps straight back into the edit form instead of the
    // normal read-only view.
    setIsEditing(false);
    setSaveErrorMsg('');
    setRevealedContact(null);
    setRevealingContact(false);
    revealVersionRef.current += 1;
    if (donor) {
      setName(donor.name);
      setPhone(donor.phone);
      setWhatsapp(donor.whatsapp);
      setBloodGroup(donor.bloodGroup);
      setBirthYear(donor.birthYear ? String(donor.birthYear) : '');
      setDistrict(donor.district);
      setArea(donor.area);
      setLastDonationDate(donor.lastDonationDate || '');
      setHbsagStatus(donor.healthInfo?.hbsagStatus || 'Not Tested');
      setHcvStatus(donor.healthInfo?.hcvStatus || 'Not Tested');
      setHivStatus(donor.healthInfo?.hivStatus || 'Not Tested');
      setSyphilisStatus(donor.healthInfo?.syphilisStatus || 'Not Tested');
      setMalariaStatus(donor.healthInfo?.malariaStatus || 'Not Tested');
      setShareScreeningCompletion(donor.shareScreeningCompletion);
    }
  }, [donor]);

  // Tracks whether the user has typed anything, so a stray back / Escape /
  // backdrop click asks before throwing the input away.
  const [dirty, setDirty] = useState(false);
  React.useEffect(() => { setDirty(false); }, [isEditing, donor]);
  const requestClose = useDismissable(!!donor, onClose, isEditing && dirty ? s.confirmDiscard : null);

  if (!donor) return null;

  const districtObj = districts.find(d => d.name === district);

  const handleSave = async () => {
    setSaveErrorMsg('');

    if (!donor.id) {
      // Should no longer be reachable now that App.tsx refuses to commit a
      // currentUser/donor with no id -- kept as a clear, specific message
      // rather than letting a stale/invalid id reach Postgres as a bad
      // request instead.
      setSaveErrorMsg(s.errSessionRefresh);
      return;
    }

    if (!isValidDonorName(name)) {
      setSaveErrorMsg(s.errNameSymbols);
      return;
    }

    setSaving(true);
    const updated = await updateDonorProfile(donor.id, {
      name,
      phone: toBdDialing(phone),
      whatsapp: toBdWhatsapp(whatsapp),
      bloodGroup,
      birthYear: birthYear ? Number(birthYear) : null,
      district,
      area,
      lastDonationDate,
      hbsagStatus,
      hcvStatus,
      hivStatus,
      syphilisStatus,
      malariaStatus,
      shareScreeningCompletion: screeningBadgeFeatureAvailable ? shareScreeningCompletion : undefined
    });
    setSaving(false);

    if (!updated) {
      setSaveErrorMsg(s.errProfileUpdate);
      return;
    }

    if (onProfileUpdated) {
      onProfileUpdated(updated);
    }
    setIsEditing(false);
  };

  const handleRevealContact = async () => {
    if (revealingContact || !isDonorAvailableNow(donor) || !isMountedRef.current) return;
    if (!currentUserId) {
      onRequireAuth();
      return;
    }
    const requestVersion = revealVersionRef.current;
    setRevealingContact(true);
    const contact = await getDonorContact(donor.id);
    if (!isMountedRef.current || requestVersion !== revealVersionRef.current) return;
    setRevealedContact(contact);
    setRevealingContact(false);
  };

  const statusOptions = ['Not Tested', 'Negative', 'Positive'];
  const statusColor = (s: string) => s === 'Positive' ? 'text-rose-600 dark:text-rose-400' : s === 'Negative' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400';
  // Stored values stay English; only the visible label is translated.
  const STATUS_LABEL: Record<string, string> = {
    'Not Tested': s.statusNotTested,
    Negative: s.statusNegative,
    Positive: s.statusPositive
  };
  const statusLabel = (value: string) => STATUS_LABEL[value] ?? value;

  return (
    <div onClick={backdropClose(requestClose)} className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div onChange={() => setDirty(true)} className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 lg:p-10 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto custom-scroll">
        <button onClick={onClose} aria-label={s.closeProfileDialog} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
          <Avatar name={donor.name} src={donor.avatar} className="w-20 h-20" textClassName="text-2xl" />
          {/* pr-10 keeps a long name from wrapping under the close button,
              which floats absolute over this row rather than sharing its
              flex layout. */}
          <div className="flex-1 min-w-0 pr-10">
            {isEditing ? (
              <input value={name} onChange={e => setName(e.target.value)} className="font-black text-xl border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 w-full mb-1 bg-white dark:bg-slate-800" />
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-black text-2xl break-words text-brand-ink dark:text-brand-green-light">{donor.name}</h3>
              </div>
            )}
            <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> {donor.area}, {donor.district}
            </p>
            <span className="mt-2 inline-block px-3 py-1 bg-rose-600 text-white font-mono text-sm font-black rounded-lg shadow-sm">
              {f(s.bloodGroupValue, { group: donor.bloodGroup })}
              {calculateAge(donor.birthYear) !== null && f(s.ageSuffix, { age: calculateAge(donor.birthYear) as number })}
            </span>
            {donor.screeningCompletionPublic && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                {s.screeningCompletionPublic}
              </span>
            )}
          </div>
        </div>

        {!isEditing ? (
          <>
            <div className="my-6 grid grid-cols-2 gap-3 text-xs font-bold">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">{s.phoneCaps}</span>
                <span className="text-slate-900 dark:text-slate-100">{isOwnProfile ? (donor.phone || s.notProvided) : revealedContact?.phone || (revealedContact ? s.notAvailableRightNow : s.hiddenUntilRevealed)}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">{s.whatsappCaps}</span>
                <span className="text-slate-900 dark:text-slate-100">{isOwnProfile ? (donor.whatsapp || donor.phone || s.notProvided) : revealedContact?.whatsapp || (revealedContact ? s.notAvailableRightNow : s.hiddenUntilRevealed)}</span>
              </div>
            </div>

            {!isOwnProfile && (
              <button
                onClick={handleRevealContact}
                disabled={!isDonorAvailableNow(donor) || revealingContact || !!revealedContact}
                className="w-full mb-4 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500"
              >
                {!isDonorAvailableNow(donor) ? s.notAvailableRightNow : revealedContact ? s.contactChecked : revealingContact ? s.checkingAvailability : s.showNumber}
              </button>
            )}

            {isOwnProfile ? <div className="my-6 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">{s.healthTelemetry}</h4>
              <div className="grid grid-cols-3 gap-3 font-mono text-xs text-center">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-bold">{s.hemoglobin}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{donor.healthInfo?.hemoglobin ? `${donor.healthInfo.hemoglobin} g/dL` : s.notAvailable}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-bold">{s.bloodPressure}</span>
                  <span className="text-slate-900 dark:text-slate-100 font-black text-sm">{donor.healthInfo?.bloodPressure || s.notAvailable}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-sans block font-bold">{s.weight}</span>
                  <span className="text-slate-900 dark:text-slate-100 font-black text-sm">{donor.healthInfo?.weightKg ? f(s.weightValue, { weight: String(donor.healthInfo.weightKg) }) : s.notAvailable}</span>
                </div>
              </div>

              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 pt-2">{s.donationRecord}</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="block text-[9px] font-bold uppercase text-slate-400">{s.timesDonated}</span>
                  <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-lg">{formatNumber(donor.donationCount ?? 0, lang)}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="block text-[9px] font-bold uppercase text-slate-400">{s.lastDonated}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">{donor.lastDonationDate || s.never}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="block text-[9px] font-bold uppercase text-slate-400">{s.nextEligible}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">{donor.nextEligibleDate || s.now}</span>
                </div>
              </div>

              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 pt-2">{s.ttiScreening}</h4>
              <div className="grid grid-cols-5 gap-2 font-mono text-[10px] text-center">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] text-slate-400 font-sans block font-bold">HBsAg</span>
                  <span className={`font-black ${statusColor(donor.healthInfo?.hbsagStatus || 'Not Tested')}`}>{statusLabel(donor.healthInfo?.hbsagStatus || 'Not Tested')}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] text-slate-400 font-sans block font-bold">HCV</span>
                  <span className={`font-black ${statusColor(donor.healthInfo?.hcvStatus || 'Not Tested')}`}>{statusLabel(donor.healthInfo?.hcvStatus || 'Not Tested')}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] text-slate-400 font-sans block font-bold">HIV</span>
                  <span className={`font-black ${statusColor(donor.healthInfo?.hivStatus || 'Not Tested')}`}>{statusLabel(donor.healthInfo?.hivStatus || 'Not Tested')}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] text-slate-400 font-sans block font-bold">{s.syphilis}</span>
                  <span className={`font-black ${statusColor(donor.healthInfo?.syphilisStatus || 'Not Tested')}`}>{statusLabel(donor.healthInfo?.syphilisStatus || 'Not Tested')}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] text-slate-400 font-sans block font-bold">{s.malaria}</span>
                  <span className={`font-black ${statusColor(donor.healthInfo?.malariaStatus || 'Not Tested')}`}>{statusLabel(donor.healthInfo?.malariaStatus || 'Not Tested')}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between font-bold">
                {donor.isSmoker !== null && (
                  <span>{s.smokingStatus} <strong className={donor.isSmoker ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>{donor.isSmoker ? s.smoker : s.nonSmoker}</strong></span>
                )}
                <span>{s.regularDonor} <strong className="text-rose-600 dark:text-rose-400">{donor.isRegular ? s.regularYes : s.regularNew}</strong></span>
              </div>
            </div> : (
              <div className="my-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm font-semibold text-amber-900 dark:text-amber-300">
                {s.healthPrivate}
              </div>
            )}

            {onProfileUpdated && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3.5 mb-4 border-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-slate-100 hover:text-white dark:hover:text-slate-900 transition-colors"
              >
                ✏️ {s.editProfile}
              </button>
            )}
          </>
        ) : (
          <div className="my-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.phone} <span className="text-rose-600 dark:text-rose-400">*</span></label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.whatsappNumber} <span className="normal-case font-medium text-slate-400">{s.optional}</span></label>
              <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.bloodGroup} <span className="text-rose-600 dark:text-rose-400">*</span></label>
                <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value as BloodGroup)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-rose-600 dark:text-rose-400">
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.birthYear} <span className="normal-case font-medium text-slate-400">{s.optional}</span></label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={birthYear}
                  onChange={e => setBirthYear(e.target.value)}
                  placeholder={s.birthYearPlaceholder}
                  className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.district} <span className="text-rose-600 dark:text-rose-400">*</span></label>
                <select value={district} onChange={e => { setDistrict(e.target.value); setArea(''); }} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold">
                  {districts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.area} <span className="text-rose-600 dark:text-rose-400">*</span></label>
                <AreaField areas={districtObj?.areas || []} value={area} onChange={setArea} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.lastDonationDate} <span className="normal-case font-medium text-slate-400">{s.optional}</span></label>
              <input
                type="date"
                value={lastDonationDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setLastDonationDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                শেষ কবে রক্ত দিয়েছেন? খালি রাখলে "প্রথমবার দাতা" দেখাবে। পরবর্তী তারিখ ১২০ দিন পর নিজে থেকেই হিসাব হবে।
              </p>
            </div>

            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 pt-2">{s.screeningEntered}</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: s.testHbsag, value: hbsagStatus, setter: setHbsagStatus },
                { label: s.testHcv, value: hcvStatus, setter: setHcvStatus },
                { label: s.testHiv, value: hivStatus, setter: setHivStatus },
                { label: s.testVdrl, value: syphilisStatus, setter: setSyphilisStatus },
                { label: s.testMp, value: malariaStatus, setter: setMalariaStatus }
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{field.label}</label>
                  <select value={field.value} onChange={e => field.setter(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
                    {statusOptions.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {screeningBadgeFeatureAvailable ? (
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={shareScreeningCompletion}
                  onChange={e => setShareScreeningCompletion(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-emerald-600"
                />
                <span>
                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{s.shareScreeningCompletion}</span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{s.shareScreeningCompletionHelp}</span>
                </span>
              </label>
            ) : (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60">
                {s.screeningFeatureUnavailable}
              </p>
            )}

            {saveErrorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400">
                {saveErrorMsg}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3.5 blood-gradient text-white rounded-2xl text-xs font-black uppercase tracking-widest disabled:opacity-60"
              >
                {saving ? s.saving : s.saveChanges}
              </button>
              <button
                onClick={() => { setSaveErrorMsg(''); setIsEditing(false); }}
                className="px-6 py-3.5 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest"
              >
                {s.cancel}
              </button>
            </div>
          </div>
        )}

        {onToggleAvailability && !isEditing && (
          <div className="p-5 bg-rose-50 dark:bg-rose-950/30 rounded-3xl border border-rose-200 dark:border-rose-900/50 flex flex-wrap items-center justify-between mb-6">
            <div>
              <p className="text-xs font-black uppercase text-rose-900 dark:text-rose-300">{s.availabilityStatus}</p>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">{donor.availableNow ? s.broadcastingAvailable : s.restingOffDuty}</p>
            </div>
            <button
              onClick={onToggleAvailability}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                donor.availableNow ? 'bg-emerald-600 text-white shadow-md animate-pulse' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
              }`}
            >
              {donor.availableNow ? `● ${s.availableNowButton}` : `○ ${s.offDutyButton}`}
            </button>
            {donor.availableNow && !isDonorAvailableNow(donor) && (
              <p className="w-full mt-3 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl px-3 py-2">
                {f(s.notYetVisibleHint, { date: donor.nextEligibleDate ?? '' })}
              </p>
            )}
          </div>
        )}

        {!isEditing && (
          <div className="flex gap-3">
            {(isOwnProfile || revealedContact?.whatsapp) && getWhatsAppUrl(isOwnProfile ? donor.whatsapp : revealedContact?.whatsapp) ? (
              <a
                href={getWhatsAppUrl(isOwnProfile ? donor.whatsapp : revealedContact?.whatsapp) || undefined}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-4 bg-slate-900 dark:bg-slate-100 hover:bg-rose-600 dark:hover:bg-rose-600 text-white dark:text-slate-900 dark:hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest text-center transition-colors shadow-lg"
              >
                {s.whatsappMessage}
              </a>
            ) : (
              <span className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest text-center">
                {!isDonorAvailableNow(donor) ? s.notAvailableRightNow : s.showNumberFirst}
              </span>
            )}
            {(isOwnProfile || revealedContact?.phone) ? (
              <a
                href={`tel:${isOwnProfile ? donor.phone : revealedContact?.phone}`}
                className="px-8 py-4 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {s.call}
              </a>
            ) : (
              <span className="px-8 py-4 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-center text-slate-400">
                {!isDonorAvailableNow(donor) ? s.notAvailableRightNow : s.showNumberFirst}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ================= 4. NOTIFICATIONS MODAL ================= */
interface NotifModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onOpenDonor?: (notification: NotificationItem) => void;
  onOpenRequest?: () => void;
}

export const NotificationsModal: React.FC<NotifModalProps> = ({ isOpen, onClose, notifications, onMarkAllRead, onOpenDonor, onOpenRequest }) => {
  useDismissable(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div onClick={backdropClose(onClose)} className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[85vh] flex flex-col text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h3 className="font-black text-xl">Live Notification Feed</h3>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onMarkAllRead} className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 hover:underline">
              Mark all read
            </button>
            <button onClick={onClose} aria-label="Close notifications dialog" className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scroll pr-1">
          {notifications.length === 0 && (
            <p className="py-10 text-center text-sm font-semibold text-slate-400">No notifications yet.</p>
          )}
          {notifications.map(notif => (
            (() => {
              const offerNotification = /\(([^)]+)\) can donate for /i.test(notif.message);
              const canViewDonor = !!notif.relatedDonorId || offerNotification;
              const isConfirmation = notif.type === 'reminder' && notif.relatedRequestId;
              const clickable = canViewDonor || isConfirmation;
              return (
            <div
              key={notif.id}
              onClick={() => {
                if (canViewDonor) onOpenDonor?.(notif);
                else if (isConfirmation) onOpenRequest?.();
              }}
              className={`p-4 rounded-2xl border transition-colors ${
                notif.read ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800' : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 shadow-2xs'
              } ${clickable ? 'cursor-pointer hover:border-rose-400 dark:hover:border-rose-700' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-bold text-sm">{notif.title}</p>
                <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{notif.time}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{notif.message}</p>
              {canViewDonor && onOpenDonor && (
                <p className="mt-2 text-[11px] font-bold text-rose-600 dark:text-rose-400">View donor profile</p>
              )}
              {isConfirmation && onOpenRequest && (
                <p className="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Open Requests to confirm</p>
              )}
            </div>
              );
            })()
          ))}
        </div>
      </div>
    </div>
  );
};

/* ================= 5. COMPLETE PROFILE MODAL ================= */
// Shown once, right after a Google (or any OAuth/magic-link) sign-in that has
// no blood group/phone/district yet -- getCurrentDonorFromSession's fallback
// insert already created a bare donor row so the sign-in itself never gets
// stuck, but that row is not usable until this is filled in. Deliberately not
// dismissable (no useDismissable, no backdrop/X close): the rest of the app
// stays mounted underneath, but the person can't act as a donor with blank
// required fields.
interface CompleteProfileModalProps {
  donor: DonorProfile;
  onCompleted: (updated: DonorProfile) => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({ donor, onCompleted }) => {
  const districts = useDistricts();
  const { s, lang } = useStrings(S);
  const [name, setName] = useState(donor.name || '');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('Banani');
  const [birthYear, setBirthYear] = useState('');
  const [isSmoker, setIsSmoker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  const clearFieldError = (field: AuthField) =>
    setFieldErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const errors: AuthFieldErrors = {};
    if (!isValidDonorName(name)) errors.name = s.errNameSymbols;
    if (!phone.trim()) errors.phone = s.errPhoneRequired;
    else if (!isValidBdMobile(phone)) errors.phone = s.errPhoneInvalid;
    if (!bloodGroup) errors.bloodGroup = s.errSelectBloodGroup;
    if (!area.trim()) errors.area = s.errAreaRequired;
    if (birthYear) {
      const year = Number(birthYear);
      const thisYear = new Date().getFullYear();
      if (!Number.isInteger(year) || year < 1900 || year > thisYear) errors.birthYear = fmt(s.errBirthYear, { year: thisYear }, lang);
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstFieldError('complete', errors);
      return;
    }

    setSaving(true);
    const { profile, error } = await completeDonorProfile(donor.id, {
      name,
      phone: toBdDialing(phone),
      whatsapp: toBdWhatsapp(phone),
      bloodGroup,
      district,
      area,
      birthYear: birthYear ? Number(birthYear) : null,
      isSmoker
    });
    setSaving(false);

    if (!profile) {
      setErrorMsg(error ? describeAuthError(error, s).text : s.errGeneric);
      return;
    }
    onCompleted(profile);
  };

  return (
    <div className="fixed inset-0 z-50 glass-dark flex items-stretch sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      {/* Full screen on phones, same as AuthModal. */}
      <div className="bg-white dark:bg-slate-900 sm:rounded-[2.5rem] px-5 pt-10 pb-8 sm:p-8 lg:p-10 w-full h-[100dvh] sm:h-auto sm:max-w-md sm:max-h-[90vh] sm:border border-slate-200 dark:border-slate-800 shadow-2xl relative text-slate-900 dark:text-slate-100 overflow-y-auto custom-scroll">
        <img src="/logo-mark.svg" alt="RBB — Roktobondhu Bangladesh" className="w-12 h-12 rounded-2xl shadow-lg shadow-rose-500/20 mb-4" />
        <h2 className="editorial-title text-2xl sm:text-3xl font-black">One Last Step</h2>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1 mb-6">
          A few required details to finish setting up your donor profile
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          <div>
            <label htmlFor="complete-name" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.fullName} <span className="text-rose-600 dark:text-rose-400">*</span></label>
            <input id="complete-name" autoComplete="name" value={name} onChange={e => { setName(e.target.value); clearFieldError('name'); }} aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'complete-name-error' : undefined} className={authInputClass(!!fieldErrors.name)} />
            <FieldError id="complete-name-error" message={fieldErrors.name} />
          </div>

          <div>
            <label htmlFor="complete-phone" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.phoneNumber} <span className="text-rose-600 dark:text-rose-400">*</span></label>
            <input id="complete-phone" type="tel" autoComplete="tel" value={phone} onChange={e => { setPhone(e.target.value); clearFieldError('phone'); }} inputMode="numeric" placeholder="01712345678" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'complete-phone-error' : undefined} className={authInputClass(!!fieldErrors.phone)} />
            <FieldError id="complete-phone-error" message={fieldErrors.phone} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="complete-bloodGroup" className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.bloodGroup} <span className="text-rose-600 dark:text-rose-400">*</span></label>
              <select id="complete-bloodGroup" value={bloodGroup} onChange={e => { setBloodGroup(e.target.value); clearFieldError('bloodGroup'); }} aria-invalid={!!fieldErrors.bloodGroup} aria-describedby={fieldErrors.bloodGroup ? 'complete-bloodGroup-error' : undefined} className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono font-bold text-rose-600 dark:text-rose-400 ${fieldErrors.bloodGroup ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}>
                <option value="" disabled>{s.selectBloodGroup}</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
              <FieldError id="complete-bloodGroup-error" message={fieldErrors.bloodGroup} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.district} <span className="text-rose-600 dark:text-rose-400">*</span></label>
              <select value={district} onChange={e => { setDistrict(e.target.value); setArea(districts.find(d => d.name === e.target.value)?.areas[0] || ''); }} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold">
                {districts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.area} <span className="text-rose-600 dark:text-rose-400">*</span></label>
            <AreaField id="complete-area" areas={districts.find(d => d.name === district)?.areas || []} value={area} onChange={value => { setArea(value); clearFieldError('area'); }} className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold ${fieldErrors.area ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'}`} />
            <FieldError id="complete-area-error" message={fieldErrors.area} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">{s.birthYear} <span className="normal-case font-medium text-slate-400">{s.optional}</span></label>
            <input
              type="number"
              inputMode="numeric"
              min={1900}
              max={new Date().getFullYear()}
              id="complete-birthYear"
              value={birthYear}
              onChange={e => { setBirthYear(e.target.value); clearFieldError('birthYear'); }}
              placeholder={s.birthYearPlaceholder}
              aria-invalid={!!fieldErrors.birthYear}
              aria-describedby={fieldErrors.birthYear ? 'complete-birthYear-error' : undefined}
              className={authInputClass(!!fieldErrors.birthYear)}
            />
            <FieldError id="complete-birthYear-error" message={fieldErrors.birthYear} />
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
            <input type="checkbox" checked={isSmoker} onChange={e => setIsSmoker(e.target.checked)} className="accent-rose-600 w-4 h-4" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.smokerCheckbox}</span>
          </label>

          {errorMsg && (
            <div role="alert" className="mt-4 flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <FieldErrorSummary prefix="complete" errors={fieldErrors} one={s.errFixFieldsOne} many={s.errFixFieldsMany} lang={lang} />

          <button type="submit" disabled={saving} className="w-full py-4 blood-gradient text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl cursor-pointer mt-4 disabled:opacity-60">
            {saving ? s.saving :'Finish Setting Up My Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};
