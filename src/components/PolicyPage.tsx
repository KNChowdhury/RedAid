import { ShieldCheck } from 'lucide-react';
import React from 'react';
import { defineStrings, useStrings } from '../i18n';
import { NoMoneyNotice } from './NoMoneyNotice';

interface PolicySection {
  title: string;
  points: string[];
}

const S = defineStrings(
  {
    titleLead: 'Policy &',
    titleAccent: 'Privacy',
    subtitle: 'Rules for using RedAid, and how we handle your data',
    updated: 'Last updated: 28 October 2026',
    contact: 'Questions, a report, or a request to delete your data? Email redvora.bd@gmail.com.'
  },
  {
    titleLead: 'নীতিমালা ও',
    titleAccent: 'গোপনীয়তা',
    subtitle: 'RedAid ব্যবহারের নিয়ম, এবং আপনার তথ্য আমরা কীভাবে রাখি',
    updated: 'সর্বশেষ হালনাগাদ: ২৮ অক্টোবর ২০২৬',
    contact: 'প্রশ্ন, অভিযোগ, বা নিজের তথ্য মুছে ফেলতে চাইলে ইমেইল করুন: redvora.bd@gmail.com'
  }
);

// The two lists below are translations of each other: same sections, same
// points, same order. Change one, change the other.
//
// Accuracy notes (keep these true when editing; they mirror the FAQ):
// - Health info is readable by the donor and by admins only (donor_health RLS).
// - Contact reveals: 10 per rolling 7 days, signed-in users only.
// - Success Stories show "A patient", never the patient's name.
// - Exact coordinates are never public; only the approximate area is shown.
// - Points come only from donations confirmed by both sides (or a hospital/admin).

const POLICY_BN: PolicySection[] = [
  {
    title: '১. রক্তদান সম্পূর্ণ স্বেচ্ছায় ও বিনামূল্যে',
    points: [
      'RedAid শুধু স্বেচ্ছায়, বিনামূল্যে রক্তদানকারী মানুষদের রোগীর সাথে যুক্ত করে।',
      'রক্তের বিনিময়ে টাকা, উপহার বা অন্য কোনো সুবিধা নেওয়া বা দেওয়া দণ্ডনীয় অপরাধ। RedAid কোনোভাবেই এটি সমর্থন করে না।',
      'কেউ টাকা চাইলে বা দিতে চাইলে সাথে সাথে আমাদের জানান। প্রমাণ মিললে সেই অ্যাকাউন্ট স্থায়ীভাবে বন্ধ করা হবে।',
      'রোগীর পরিবার দাতার যাতায়াত বা খাবারের খরচ দিতে চাইলে সেটা তাদের নিজস্ব ব্যাপার। এটা কখনো রক্তের দাম হতে পারে না, আর দাতা তা চাইতে পারবেন না।'
    ]
  },
  {
    title: '২. আমরা কী তথ্য রাখি',
    points: [
      'নাম, ফোন নম্বর, ইমেইল (ঐচ্ছিক), ব্লাড গ্রুপ, জেলা ও এলাকা, জন্মসাল (ঐচ্ছিক), সর্বশেষ রক্তদানের তারিখ (ঐচ্ছিক)।',
      'স্বাস্থ্য স্ক্রিনিং তথ্য (HBsAg, Anti-HCV, Anti-HIV, VDRL, MP)। এগুলো আপনার নিজের দেওয়া তথ্য; RedAid ল্যাবে যাচাই করে না।',
      'রক্তের অনুরোধ: হাসপাতাল, প্রয়োজনীয় ব্যাগ, সময় ও যোগাযোগের নম্বর।',
      'আমরা আপনার তথ্য বিক্রি করি না, বিজ্ঞাপনদাতাকে দিই না।'
    ]
  },
  {
    title: '৩. কে কী দেখতে পায়',
    points: [
      'স্বাস্থ্য তথ্য: শুধু আপনি এবং RedAid অ্যাডমিন।',
      'ফোন নম্বর: শুধু সাইন ইন করা ব্যবহারকারী, দাতা "এখন দিতে পারবেন" অবস্থায় থাকলে, আর যেকোনো ৭ দিনে সর্বোচ্চ ১০ জনের।',
      'অবস্থান: শুধু আনুমানিক এলাকা; সঠিক ঠিকানা বা স্থানাঙ্ক কখনো প্রকাশ হয় না।',
      'সফলতার গল্প: দাতার নাম, ব্লাড গ্রুপ, হাসপাতাল ও এলাকা দেখা যায়; রোগীর নাম কখনো দেখানো হয় না।'
    ]
  },
  {
    title: '৪. ব্যবহারের নিয়ম',
    points: [
      'ভুয়া রক্তের অনুরোধ, ভুয়া প্রোফাইল বা ভুল রক্তদানের দাবি করা যাবে না।',
      'দাতার নম্বর শুধু রক্তের প্রয়োজনে ব্যবহার করা যাবে। বিজ্ঞাপন, হয়রানি বা অন্য কাজে ব্যবহার নিষেধ।',
      'রক্তদান রেকর্ড করার সময় দাতার ব্লাড গ্রুপ রোগীর জন্য উপযুক্ত হতে হবে; না হলে সিস্টেম তা গ্রহণ করবে না।',
      'নিয়ম ভাঙলে কোনো সতর্কতা ছাড়াই অ্যাকাউন্ট বন্ধ করা হতে পারে।'
    ]
  },
  {
    title: '৫. চিকিৎসা সংক্রান্ত সতর্কতা',
    points: [
      'RedAid কোনো হাসপাতাল, ব্লাড ব্যাংক বা সরকারি প্রতিষ্ঠান নয়। আমরা শুধু মানুষকে যুক্ত করি।',
      'রক্ত নেওয়ার আগে অবশ্যই স্বীকৃত হাসপাতাল বা ব্লাড ব্যাংকে ক্রস-ম্যাচ ও প্রয়োজনীয় পরীক্ষা করাতে হবে।',
      'দুটি রক্তদানের মধ্যে কমপক্ষে ১২০ দিন বিরতি দিন। অসুস্থ বোধ করলে রক্ত দেবেন না।',
      'জীবন-মরণ জরুরি অবস্থায় আগে নিকটস্থ হাসপাতালে যোগাযোগ করুন।'
    ]
  },
  {
    title: '৬. পয়েন্ট ও উপহার',
    points: [
      'পয়েন্ট শুধু নিশ্চিত হওয়া রক্তদান থেকে আসে। পয়েন্টের কোনো নগদ মূল্য নেই; বিক্রি বা হস্তান্তর করা যায় না।',
      'উপহার হলো ধন্যবাদ জানানোর উপায়, রক্তের দাম নয়। উপহার দেওয়ার আগে রক্তদান যাচাই করা হবে।',
      'ভুয়া রক্তদান দেখিয়ে পয়েন্ট নিলে পয়েন্ট বাতিল ও অ্যাকাউন্ট বন্ধ হবে।',
      'উপহারের তালিকা ও শর্ত সময়ের সাথে বদলাতে পারে; স্টক শেষ হলে সমমানের উপহার দেওয়া হতে পারে।'
    ]
  },
  {
    title: '৭. আপনার অধিকার',
    points: [
      'যেকোনো সময় প্রোফাইল থেকে নিজের তথ্য বদলাতে পারবেন।',
      '"এখন দিতে পারবেন" টগল বন্ধ করলে আপনার নম্বর আর কেউ দেখতে পাবে না।',
      'অ্যাকাউন্ট ও তথ্য মুছে ফেলতে চাইলে ইমেইল করুন; যাচাইয়ের পর মুছে ফেলা হবে।'
    ]
  },
  {
    title: '৮. প্রোফাইল রিপোর্ট',
    points: [
      'কারো প্রোফাইলে "এই প্রোফাইল রিপোর্ট করুন" চাপলে আমাদের কাছে একটা ইমেইল যায়। কেউ টাকা চাইলে, প্রোফাইল ভুয়া মনে হলে, হয়রানি করলে বা ভুল তথ্য দিলে রিপোর্ট করুন।',
      'রিপোর্টে শুধু প্রোফাইলের আইডি যায়; সেই মানুষের নাম বা ফোন নম্বর নয়। আপনার ইমেইল ঠিকানা শুধু আমরা দেখি।',
      'যিনি রিপোর্ট করেছেন তার পরিচয় রিপোর্ট হওয়া ব্যক্তিকে জানানো হয় না।',
      'প্রতিটি রিপোর্ট আমরা দেখি। প্রয়োজনে প্রোফাইল লুকানো বা অ্যাকাউন্ট বন্ধ করা হয়। মিথ্যা রিপোর্ট বারবার করলে সেই অ্যাকাউন্টও বন্ধ হতে পারে।'
    ]
  }
];

const POLICY_EN: PolicySection[] = [
  {
    title: '1. Blood donation is voluntary and free',
    points: [
      'RedAid only connects voluntary, unpaid donors with patients.',
      'Taking or giving money, gifts or any other benefit in exchange for blood is a punishable offence. RedAid does not support it in any way.',
      'If anyone asks for or offers money, report it to us right away. Accounts found doing this are permanently closed.',
      "A patient's family may choose to cover a donor's travel or food. That is their own choice; it is never a price for blood, and a donor may not ask for it."
    ]
  },
  {
    title: '2. What we store',
    points: [
      'Name, phone number, email (optional), blood group, district and area, birth year (optional), last donation date (optional).',
      'Health screening (HBsAg, Anti-HCV, Anti-HIV, VDRL, MP). This is self-reported; RedAid does not lab-verify it.',
      'Blood requests: hospital, bags needed, time and a contact number.',
      'We do not sell your data or share it with advertisers.'
    ]
  },
  {
    title: '3. Who can see what',
    points: [
      'Health information: only you and RedAid admins.',
      'Phone numbers: only signed-in users, only while the donor is "Available now", and at most 10 donors in any 7 days.',
      'Location: only the approximate area; exact addresses or coordinates are never public.',
      "Success stories: the donor's name, blood group, hospital and area. The patient's name is never shown."
    ]
  },
  {
    title: '4. Rules of use',
    points: [
      'No fake blood requests, fake profiles or false donation claims.',
      "Use a donor's number only for a blood need. No ads, harassment or any other use.",
      "When recording a donation, the donor's blood group must be compatible with the patient; otherwise the system rejects it.",
      'Breaking these rules can get an account closed without warning.'
    ]
  },
  {
    title: '5. Medical disclaimer',
    points: [
      'RedAid is not a hospital, blood bank or government body. We only connect people.',
      'Blood must always be cross-matched and screened at a recognised hospital or blood bank before transfusion.',
      'Leave at least 120 days between donations. Do not donate if you feel unwell.',
      'In a life-threatening emergency, contact the nearest hospital first.'
    ]
  },
  {
    title: '6. Points and gifts',
    points: [
      'Points come only from confirmed donations. Points have no cash value and cannot be sold or transferred.',
      'Gifts are a thank-you, not a price for blood. Every donation is checked before a gift is given.',
      'Points earned through fake donations are cancelled and the account is closed.',
      'The gift list and terms may change; if an item is out of stock, a gift of similar value may be given.'
    ]
  },
  {
    title: '7. Your rights',
    points: [
      'You can change your information from your profile at any time.',
      'Turning "Available now" off hides your number from everyone.',
      'To delete your account and data, email us; we delete it after confirming it is you.'
    ]
  },
  {
    title: '8. Reporting a profile',
    points: [
      `Tap "Report this profile" on anyone's profile to email us. Report anyone who asks for money, looks fake, harasses people, or gives wrong information.`,
      "The report carries only the profile's id, not that person's name or phone number. Only we see your email address.",
      'We never tell the reported person who reported them.',
      'We review every report and may hide the profile or close the account. Repeated false reports can also get an account closed.'
    ]
  }
];

export const PolicyPage: React.FC = () => {
  const { s, lang } = useStrings(S);
  const sections = lang === 'bn' ? POLICY_BN : POLICY_EN;

  return (
    <section className="p-4 sm:p-6 lg:p-10 lg:overflow-hidden flex flex-col lg:h-full bg-white dark:bg-slate-900 min-w-0">
      <header className="mb-6">
        <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 dark:text-slate-100 leading-tight mb-3 break-words">
          {s.titleLead} <span className="text-rose-600 dark:text-rose-400">{s.titleAccent}</span>
        </h1>
        <p className="text-slate-500 text-sm">{s.subtitle}</p>
        <p className="text-slate-400 text-xs mt-1">{s.updated}</p>
      </header>

      <div className="flex-1 overflow-y-auto pr-1 custom-scroll pb-12 space-y-5 max-w-3xl">
        <NoMoneyNotice />

        {sections.map(section => (
          <div key={section.title} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-3">{section.title}</h2>
            <ul className="space-y-2">
              {section.points.map(point => (
                <li key={point} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 px-5 py-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-900 dark:text-rose-300 leading-relaxed break-words">{s.contact}</p>
        </div>
      </div>
    </section>
  );
};
