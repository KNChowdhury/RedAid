import { ChevronDown, HelpCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import { defineStrings, useStrings } from '../i18n';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqGroup {
  title: string;
  items: FaqItem[];
}

const S = defineStrings(
  {
    titleLead: 'How It',
    titleAccent: 'Works.',
    subtitle: 'Frequently asked questions about Roktobondhu Bangladesh',
    notFound: "Can't find your answer here? Email us at the address in the footer."
  },
  {
    titleLead: 'কীভাবে',
    titleAccent: 'কাজ করে?',
    subtitle: 'Roktobondhu Bangladesh সম্পর্কে সবচেয়ে বেশি জিজ্ঞাসিত প্রশ্ন',
    notFound: 'আপনার প্রশ্নের উত্তর এখানে না পেলে ফুটারে দেওয়া ইমেইলে যোগাযোগ করুন।'
  }
);

// The two lists below are translations of each other: same groups, same
// questions, same order. Change one, change the other.
//
// Accuracy notes (keep these true when editing):
// - There is no automatic/push alert to donors yet. Browser alerts only fire
//   while the site is open in a tab, and only after the donor turned them on
//   (useBrowserNotifications.ts). Don't promise more than that.
// - Health info is readable by the donor and by admins (donor_health RLS).
// - Success Stories always show "A patient", never the patient's name.
// - Contact reveals: 10 successful reveals per rolling 7 days (patch_24).

const FAQ_GROUPS_BN: FaqGroup[] = [
  {
    title: 'শুরু করা',
    items: [
      {
        q: 'Roktobondhu Bangladesh আসলে কী?',
        a: 'এটি একটি ওয়েবসাইট যা রক্তদাতা এবং রক্তের প্রয়োজন যাদের, তাদের সরাসরি একে অপরের সাথে যুক্ত করে। কোনো মধ্যস্থতাকারী নেই — আপনি নিজে দাতা খুঁজে তার সাথে সরাসরি যোগাযোগ করতে পারেন, অথবা একটি অনুরোধ পোস্ট করতে পারেন। পোস্ট করা অনুরোধ "অনুরোধ" পেজে সবাই দেখতে পান, আর এক ট্যাপেই সেটি WhatsApp গ্রুপে শেয়ার করা যায়।',
      },
      {
        q: 'কীভাবে সাইন আপ করব?',
        a: 'তিনটি উপায় আছে: ইমেইল ও পাসওয়ার্ড দিয়ে সরাসরি সাইন আপ, Google দিয়ে এক ক্লিকে সাইন ইন, অথবা পাসওয়ার্ড ছাড়া শুধু ইমেইলে পাঠানো ম্যাজিক লিংক দিয়ে সাইন ইন (এটি শুধু আগে থেকে অ্যাকাউন্ট থাকা ব্যবহারকারীদের জন্য কাজ করে)। পাসওয়ার্ড ভুলে গেলে সাইন ইন পেজ থেকে ইমেইলে রিসেট লিংক পাঠানো যায়। এখন পর্যন্ত ফোন নম্বর দিয়ে সরাসরি সাইন ইন করার অপশন নেই।',
      },
      {
        q: 'রক্তদাতা না হয়েও কি ব্যবহার করা যাবে?',
        a: 'হ্যাঁ। সাইন ইন ছাড়াই যে কেউ পাবলিক দাতা তালিকা দেখতে পারবেন এবং কে কোন এলাকায় কোন ব্লাড গ্রুপের, তা জানতে পারবেন। তবে কারো ফোন নম্বর দেখতে বা রক্তের অনুরোধ পোস্ট করতে অবশ্যই সাইন ইন করতে হবে।',
      },
    ],
  },
  {
    title: 'প্রোফাইল ও স্বাস্থ্য তথ্য',
    items: [
      {
        q: 'প্রোফাইলে কোন কোন তথ্য দিতে হয়?',
        a: 'নাম, ফোন নম্বর, ব্লাড গ্রুপ, জেলা ও এলাকা, জন্মসাল (ঐচ্ছিক), সর্বশেষ কবে রক্ত দিয়েছেন (ঐচ্ছিক), এবং একটি সংক্ষিপ্ত স্বাস্থ্য স্ক্রিনিং সেকশন — HBsAg, Anti-HCV, Anti-HIV, VDRL (সিফিলিস), MP (ম্যালেরিয়া)। প্রতিটির ডিফল্ট মান "Not Tested" (পরীক্ষা করা হয়নি) — এগুলো সম্পূর্ণ স্ব-ঘোষিত তথ্য, Roktobondhu Bangladesh এগুলো ল্যাবের মাধ্যমে যাচাই করে না।',
      },
      {
        q: 'আমার স্বাস্থ্য তথ্য কে দেখতে পারবে?',
        a: 'শুধু আপনি নিজে, আর Roktobondhu Bangladesh-এর অ্যাডমিন। অন্য কোনো ব্যবহারকারী — সাইন ইন করা বা না করা কেউই — আপনার HBsAg/HCV/HIV/VDRL/MP তথ্য দেখতে পারবে না। ডেটাবেজেও এটি আলাদাভাবে সুরক্ষিত রাখা আছে — শুধু আপনার নিজের অ্যাকাউন্ট এবং অ্যাডমিন অ্যাকাউন্ট এই তথ্য পড়তে পারে।',
      },
      {
        q: '"সর্বশেষ রক্তদানের তারিখ" দিলে কী হয়?',
        a: 'সেই তারিখের ১২০ দিন পরের তারিখটি আপনার "পরবর্তী যোগ্য তারিখ" (Next Eligible) হিসেবে স্বয়ংক্রিয়ভাবে হিসাব হয়ে যায় — এটা নিজে হাতে বসাতে হয় না। খালি রাখলে আপনাকে "প্রথমবার দাতা" হিসেবে দেখানো হবে।',
      },
    ],
  },
  {
    title: 'অ্যাভেইলেবিলিটি ও যোগাযোগ',
    items: [
      {
        q: '"এখন দিতে পারবেন" টগলটা কী করে?',
        a: 'এটি একটি সুইচ, যা দিয়ে আপনি নিজে বলে দেন আপনি এখন রক্ত দিতে প্রস্তুত কিনা। এটি সম্পূর্ণ আপনার নিজের নিয়ন্ত্রণে — অন রাখলে অন্যরা আপনাকে "এখন দিতে পারবেন" হিসেবে দেখবে এবং যোগাযোগ করতে পারবে।',
      },
      {
        q: 'আমি টগল অন রেখেছি, তবুও প্রোফাইলে "এখন দিতে পারবেন না" দেখাচ্ছে কেন?',
        a: 'আপনার সর্বশেষ রক্তদানের তারিখ থেকে এখনো ১২০ দিন পার হয়নি বলে। মেডিকেল নিরাপত্তার জন্য, আপনার পরবর্তী যোগ্য তারিখ না আসা পর্যন্ত অন্যরা আপনাকে "এখন দিতে পারবেন" হিসেবে দেখতে পাবেন না বা আপনার নম্বর দেখতে পারবেন না — এমনকি আপনার নিজের টগল অন থাকলেও। ঠিক কোন তারিখ থেকে আবার "এখন দিতে পারবেন" দেখাবে, তা আপনার প্রোফাইলে লেখা থাকে।',
      },
      {
        q: 'কারো ফোন নম্বর দেখতে কী লাগে?',
        a: 'সাইন ইন করা থাকতে হবে, এবং সেই দাতা অবশ্যই "এখন দিতে পারবেন" অবস্থায় (এবং যোগ্য) থাকতে হবে। যেকোনো ৭ দিনে সর্বোচ্চ ১০ জন দাতার নম্বর দেখা যায় — এই সীমা অপব্যবহার ঠেকাতে। সীমা শেষ হয়ে গেলে অপেক্ষা করতে হয়: প্রতিটি নম্বর দেখার ঠিক ৭ দিন পর সেটি আর সীমায় গোনা হয় না। নিজের নম্বর এই সীমায় গোনা হয় না — সেটি আপনার নিজের প্রোফাইলে এমনিতেই দেখা যায়।',
      },
      {
        q: 'নম্বর দেখার পর কীভাবে যোগাযোগ করব?',
        a: 'নম্বর দেখানোর পর সরাসরি কল অথবা WhatsApp মেসেজ বাটন পাবেন (যদি ঐ দাতা WhatsApp নম্বর দিয়ে থাকেন)।',
      },
    ],
  },
  {
    title: 'রক্তের অনুরোধ ও নোটিফিকেশন',
    items: [
      {
        q: 'রক্তের অনুরোধ পোস্ট করলে কী হয়?',
        a: 'আপনার প্রয়োজনীয় ব্লাড গ্রুপ, জেলা, প্রয়োজনীয় ব্যাগ সংখ্যা এবং জরুরিতার মাত্রা (🚨 অতি জরুরি / ⚠️ জরুরি / ℹ️ সাধারণ) দিয়ে অনুরোধ তৈরি হয়। অনুরোধটি সাথে সাথে "অনুরোধ" পেজে সবার জন্য দেখা যায়, আর এক ট্যাপেই সেটি WhatsApp গ্রুপে শেয়ার করা যায় — দ্রুত রক্ত খুঁজে পেতে এটিই সবচেয়ে কার্যকর। দাতাদের কাছে স্বয়ংক্রিয় নোটিফিকেশন পাঠানো এখনো চালু হয়নি: যেসব দাতা নিজে অ্যালার্ট চালু করেছেন, শুধু সাইটটি তাদের ব্রাউজারে খোলা থাকলেই তারা স্ক্রিনে নতুন অনুরোধের অ্যালার্ট পান।',
      },
      {
        q: '"অতি জরুরি" মার্ক করলে আলাদা কী হয়?',
        a: 'অতি জরুরি (🚨) অনুরোধ "অনুরোধ" পেজে লাল রঙে আলাদা করে হাইলাইট করা থাকে, যাতে সহজে চোখে পড়ে, আর WhatsApp-এ শেয়ার করা মেসেজে "⚠️ অতি জরুরি" লেখা থাকে। এটি শুধু সত্যিকারের জরুরি পরিস্থিতির জন্য রাখুন।',
      },
      {
        q: 'নোটিফিকেশন বেল আইকনে কী দেখায়?',
        a: 'আপনার অ্যাকাউন্টের আপডেট — যেমন অনুরোধকারী আপনার দান রেকর্ড করে আপনার নিশ্চিতকরণ চাইলে, বা আপনার দান নিশ্চিত হয়ে পয়েন্ট যোগ হলে। সাইন ইন করা অবস্থায় সাইটটি খোলা থাকলে নতুন নোটিফিকেশন রিয়েল-টাইমে চলে আসে — পেজ রিফ্রেশ করার দরকার নেই।',
      },
    ],
  },
  {
    title: 'রক্তদান নিশ্চিতকরণ ও পয়েন্ট',
    items: [
      {
        q: 'রক্ত দেওয়ার পর কীভাবে সেটা রেকর্ড হয়?',
        a: 'তিনটি ধাপে: (১) আপনি একটি অনুরোধে "আমি দিতে পারব" চাপেন। (২) যিনি অনুরোধ করেছিলেন, তিনি বাস্তবে রক্ত পাওয়ার পর "রক্ত পেয়েছি" চেপে সেটা রেকর্ড করেন। (৩) আপনি নিজে সেই দানটি নিশ্চিত করেন। শুধু আপনার নিজের নিশ্চিতকরণের পরেই আপনার পয়েন্ট, জীবন বাঁচানোর সংখ্যা এবং পরবর্তী যোগ্য তারিখ আপডেট হয় — অর্থাৎ কেউ আপনার অনুমতি ছাড়া আপনার নামে দান "বসিয়ে" দিতে পারে না।',
      },
      {
        q: 'একটি নিশ্চিত দানে কী পাই?',
        a: '+১৫০ Roktobondhu পয়েন্ট, জীবন বাঁচানোর সংখ্যায় +১, আপনার সর্বশেষ রক্তদানের তারিখ সেই দানের তারিখে সেট হয়ে যায়, এবং আপনার "এখন দিতে পারবেন" সুইচ স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যায়। ১২০ দিন পার হওয়ার পর আবার রক্ত দিতে প্রস্তুত হলে সুইচটি নিজে অন করে দিন।',
      },
      {
        q: 'হাসপাতাল বা অ্যাডমিন কি সরাসরি দান নিশ্চিত করতে পারে?',
        a: 'হ্যাঁ — hospital বা admin রোলের ব্যবহারকারীরা একটি দান সরাসরি ভেরিফাই করে একই পয়েন্ট / জীবন বাঁচানোর সংখ্যা / ১২০ দিনের হিসাব চালু করতে পারেন, দাতার নিজের নিশ্চিতকরণের অপেক্ষা ছাড়াই — যেমন হাসপাতালে সরাসরি রক্তদান হলে।',
      },
    ],
  },
  {
    title: 'পুরস্কার, লিডারবোর্ড ও অন্যান্য',
    items: [
      {
        q: '"পুরস্কার" ট্যাবে কী আছে?',
        a: 'আপনার মোট Roktobondhu পয়েন্ট, অর্জিত ব্যাজসমূহ, এবং সবচেয়ে বেশি অবদান রাখা দাতাদের লিডারবোর্ড। পয়েন্ট বাড়ার সাথে সাথে নতুন ব্যাজ আনলক হয়।',
      },
      {
        q: '"সফলতার গল্প" ট্যাবে কী দেখা যায়?',
        a: 'প্রতিটি নিশ্চিত হওয়া রক্তদান এখানে দেখা যায় — কে দান করেছেন, কত ব্যাগ, কোন ব্লাড গ্রুপ এবং কোন হাসপাতালে। গোপনীয়তার জন্য রোগীর নাম দেখানো হয় না।',
      },
      {
        q: 'আমার তথ্য কতটা নিরাপদ?',
        a: 'আপনার ঠিকানার সঠিক স্থানাঙ্ক (lat/lng) পাবলিকভাবে প্রকাশিত হয় না — শুধু আনুমানিক এলাকা দেখানো হয়। ফোন নম্বর শুধুমাত্র সাইন ইন করা ব্যবহারকারীরা, সীমিত সংখ্যক বার, দেখতে পান। স্বাস্থ্য তথ্য অন্য কোনো ব্যবহারকারীর কাছে কখনও প্রকাশিত হয় না।',
      },
    ],
  },
];

const FAQ_GROUPS_EN: FaqGroup[] = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'What is Roktobondhu Bangladesh, exactly?',
        a: "It's a website that connects blood donors directly with people who need blood. There's no middleman — you can find a donor yourself and contact them directly, or post a request. A posted request is visible to everyone on the Requests page, and you can share it to WhatsApp groups in one tap.",
      },
      {
        q: 'How do I sign up?',
        a: 'There are three ways: sign up directly with email and password, sign in with one click using "Continue with Google", or sign in without a password using a magic link sent to your email ("Login with email link" — this only works if you already have an account). If you forget your password, use "Forgot password?" to get a reset link by email. Signing in with a phone number isn\'t available yet.',
      },
      {
        q: 'Can I use it without being a donor?',
        a: 'Yes. Anyone can browse the public donor list without signing in and see who is in which area and which blood group they are. But you must sign in to see anyone\'s phone number or to post a blood request.',
      },
    ],
  },
  {
    title: 'Profile & health info',
    items: [
      {
        q: 'What information goes on my profile?',
        a: 'Your name, phone number, blood group, district and area, birth year (optional), when you last donated (optional), and a short health screening section — HBsAg, Anti-HCV, Anti-HIV, VDRL (syphilis), MP (malaria). Each one defaults to "Not Tested". These are entirely self-reported; Roktobondhu Bangladesh does not verify them with a lab.',
      },
      {
        q: 'Who can see my health information?',
        a: "Only you, and Roktobondhu Bangladesh's admins. No other user — signed in or not — can see your HBsAg/HCV/HIV/VDRL/MP information. It's also protected separately in the database — only your own account and admin accounts can read it.",
      },
      {
        q: 'What happens when I enter my "last donation date"?',
        a: 'Your "next eligible date" is worked out automatically as 120 days after that date — you don\'t have to enter it yourself. If you leave it blank, you\'ll be shown as a "first-time donor".',
      },
    ],
  },
  {
    title: 'Availability & contact',
    items: [
      {
        q: 'What does the "Available Now" toggle do?',
        a: 'It\'s a switch you use to say whether you\'re ready to donate right now. It\'s entirely in your control — while it\'s on, others see you as "Available now" and can contact you.',
      },
      {
        q: 'My toggle is on, so why does my profile still say "Not available"?',
        a: 'Because 120 days haven\'t passed yet since your last donation. For medical safety, until your next eligible date arrives, others won\'t see you as "Available" or be able to see your number — even if your own toggle is on. Your profile shows the exact date from which you\'ll appear as available again.',
      },
      {
        q: "What do I need to see someone's phone number?",
        a: "You need to be signed in, and that donor must be \"Available Now\" (and eligible). You can see up to 10 donors' numbers in any 7 days — this limit is there to prevent misuse. If you reach it, you'll need to wait: each number you viewed stops counting exactly 7 days after you viewed it. Your own number doesn't count — it's always visible on your own profile.",
      },
      {
        q: 'How do I get in touch after the number is shown?',
        a: "Once the number is shown, you'll get buttons to call directly or send a WhatsApp message (if that donor has added a WhatsApp number).",
      },
    ],
  },
  {
    title: 'Blood requests & notifications',
    items: [
      {
        q: 'What happens when I post a blood request?',
        a: "A request is created with the blood group you need, the district, the number of bags, and the urgency level (🚨 Critical / ⚠️ High / ℹ️ Medium). It appears right away on the Requests page for everyone to see, and you can share it to WhatsApp groups in one tap — that's the fastest way to find blood. Automatic notifications to donors aren't available yet: donors who have turned on alerts only get an on-screen alert about new requests while they have the site open in their browser.",
      },
      {
        q: 'What\'s different when I mark a request "Critical"?',
        a: 'A Critical (🚨) request is highlighted in red on the Requests page so it stands out, and the WhatsApp share message is marked "⚠️ অতি জরুরি" (very urgent). Please keep it for genuine emergencies only.',
      },
      {
        q: 'What does the notification bell show?',
        a: "Updates for your account — for example, when a requester records your donation and asks you to confirm it, or when your donation is confirmed and points are added. While you're signed in with the site open, new notifications arrive in real time — no need to refresh the page.",
      },
    ],
  },
  {
    title: 'Donation confirmation & points',
    items: [
      {
        q: 'How is my donation recorded after I give blood?',
        a: 'In three steps: (1) You tap "I can donate" on a request. (2) Once the requester has actually received the blood, they record it with "Got blood". (3) You confirm that donation yourself. Your points, lives saved count and next eligible date are updated only after your own confirmation — so nobody can put a donation on your record without your consent.',
      },
      {
        q: 'What do I get for a confirmed donation?',
        a: '+150 Roktobondhu points, +1 to your lives saved count, your last donation date is set to that donation\'s date, and your "Available Now" switch turns off automatically. Once 120 days have passed and you\'re ready to donate again, turn the switch back on.',
      },
      {
        q: 'Can a hospital or admin confirm a donation directly?',
        a: "Yes — users with the hospital or admin role can verify a donation directly, which applies the same points / lives saved / 120-day update without waiting for the donor's own confirmation — for example, when the donation happened at the hospital.",
      },
    ],
  },
  {
    title: 'Rewards, leaderboard & more',
    items: [
      {
        q: "What's in the Rewards tab?",
        a: 'Your total Roktobondhu points, the badges you\'ve earned, and a leaderboard of the donors who have contributed the most. New badges unlock as your points grow.',
      },
      {
        q: 'What does the Success Stories tab show?',
        a: "Every confirmed donation shows up here — who donated, how many bags, which blood group and at which hospital. The patient's name is not shown, for privacy.",
      },
      {
        q: 'How safe is my information?',
        a: 'The exact coordinates of your address (lat/lng) are never made public — only your approximate area is shown. Phone numbers can only be seen by signed-in users, a limited number of times. Your health information is never shown to other users.',
      },
    ],
  },
];

// Dev-only guard: the two languages must stay 1:1 (same groups, same number
// of questions per group). Stripped from production builds.
if (import.meta.env.DEV) {
  const outOfSync =
    FAQ_GROUPS_EN.length !== FAQ_GROUPS_BN.length ||
    FAQ_GROUPS_EN.some((group, i) => group.items.length !== FAQ_GROUPS_BN[i]?.items.length);
  if (outOfSync) console.error('FaqSection: FAQ_GROUPS_EN and FAQ_GROUPS_BN are out of sync.');
}

export const FaqSection: React.FC = () => {
  const { s, lang } = useStrings(S);
  const groups = lang === 'bn' ? FAQ_GROUPS_BN : FAQ_GROUPS_EN;
  // Keyed by position, not text, so an open answer stays open when the
  // language is switched.
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section className="p-6 lg:p-10 lg:overflow-hidden flex flex-col lg:h-full bg-white dark:bg-slate-900 min-w-0">
      <header className="mb-8">
        <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 dark:text-slate-100 leading-none mb-3 whitespace-nowrap">
          {s.titleLead} <span className="text-rose-600 dark:text-rose-400">{s.titleAccent}</span>
        </h1>
        <p className="text-slate-400 font-bold max-w-lg uppercase text-[11px] tracking-widest">
          {s.subtitle}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto pr-2 custom-scroll pb-12 space-y-8">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <h2 className="text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-3">{group.title}</h2>
            <div className="space-y-2.5">
              {group.items.map((item, itemIndex) => {
                const key = `${groupIndex}-${itemIndex}`;
                const isOpen = openKey === key;
                return (
                  <div key={key} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 overflow-hidden">
                    <button
                      onClick={() => setOpenKey(isOpen ? null : key)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">{item.q}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <p className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 px-5 py-4 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-900 dark:text-rose-300 leading-relaxed">
            {s.notFound}
          </p>
        </div>
      </div>
    </section>
  );
};
