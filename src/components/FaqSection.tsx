import { ChevronDown, HelpCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqGroup {
  title: string;
  items: FaqItem[];
}

const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'শুরু করা',
    items: [
      {
        q: 'Roktobondhu Bangladesh আসলে কী?',
        a: 'এটি একটি ওয়েবসাইট যা রক্তদাতা এবং রক্তের প্রয়োজন যাদের, তাদের সরাসরি একে অপরের সাথে যুক্ত করে। কোনো মধ্যস্থতাকারী নেই — আপনি নিজে দাতা খুঁজে তার সাথে সরাসরি যোগাযোগ করতে পারেন, অথবা একটি অনুরোধ পোস্ট করলে কাছাকাছি উপযুক্ত দাতারা স্বয়ংক্রিয়ভাবে নোটিফিকেশন পান।',
      },
      {
        q: 'কীভাবে সাইন আপ করব?',
        a: 'চারটি উপায় আছে: ইমেইল ও পাসওয়ার্ড দিয়ে সরাসরি সাইন আপ, "Continue with Google" দিয়ে এক ক্লিকে সাইন-ইন, অথবা পাসওয়ার্ড ছাড়া শুধু ইমেইলে পাঠানো ম্যাজিক লিংক দিয়ে সাইন-ইন (এটি শুধু আগে থেকে একাউন্ট থাকা ব্যবহারকারীদের জন্য কাজ করে)। পাসওয়ার্ড ভুলে গেলে "Forgot password" থেকে রিসেট লিংক পাঠানো যায়। এখন পর্যন্ত ফোন নম্বর দিয়ে সরাসরি সাইন-ইন করার অপশন নেই।',
      },
      {
        q: 'রক্তদাতা না হয়েও কি ব্যবহার করা যাবে?',
        a: 'হ্যাঁ। সাইন-ইন ছাড়াই যে কেউ পাবলিক দাতা তালিকা দেখতে পারবেন এবং কে কোন এলাকায় কোন ব্লাড গ্রুপের, তা জানতে পারবেন। তবে কারো ফোন নম্বর দেখতে বা রক্তের অনুরোধ পোস্ট করতে অবশ্যই সাইন-ইন করা লাগবে।',
      },
    ],
  },
  {
    title: 'প্রোফাইল ও স্বাস্থ্য তথ্য',
    items: [
      {
        q: 'প্রোফাইলে কোন কোন তথ্য দিতে হয়?',
        a: 'নাম, ব্লাড গ্রুপ, জেলা ও এলাকা, জন্মসাল (ঐচ্ছিক), সর্বশেষ কবে রক্ত দিয়েছেন (ঐচ্ছিক), এবং একটি সংক্ষিপ্ত স্বাস্থ্য স্ক্রিনিং সেকশন — HBsAg, Anti-HCV, Anti-HIV, VDRL (সিফিলিস), MP (ম্যালেরিয়া)। প্রতিটির ডিফল্ট মান "Not Tested" — এগুলো সম্পূর্ণ স্ব-ঘোষিত তথ্য, Roktobondhu Bangladesh এগুলো ল্যাবের মাধ্যমে যাচাই করে না।',
      },
      {
        q: 'আমার স্বাস্থ্য তথ্য কে দেখতে পারবে?',
        a: 'শুধু আপনি নিজে। অন্য কোনো ব্যবহারকারী — সাইন-ইন করা বা না করা কেউই — আপনার HBsAg/HCV/HIV/VDRL/MP তথ্য দেখতে পারবে না। ডেটাবেজেও এটি আলাদাভাবে সুরক্ষিত রাখা আছে, শুধু আপনার নিজের একাউন্ট এই তথ্য পড়তে পারে।',
      },
      {
        q: '"সর্বশেষ রক্তদানের তারিখ" দিলে কী হয়?',
        a: 'এই তারিখ দেওয়ার ১২০ দিন পর আপনার "পরবর্তী যোগ্য তারিখ" (Next Eligible) স্বয়ংক্রিয়ভাবে হিসাব হয়ে যায় — এটা নিজে হাতে বসাতে হয় না। খালি রাখলে আপনাকে "প্রথমবার দাতা" (first-time donor) হিসেবে দেখানো হবে।',
      },
    ],
  },
  {
    title: 'অ্যাভেইলেবিলিটি ও যোগাযোগ',
    items: [
      {
        q: '"Available Now" টগলটা কী করে?',
        a: 'এটি একটি সুইচ, যা দিয়ে আপনি নিজে বলে দেন আপনি এখন রক্ত দিতে প্রস্তুত কিনা। এটি সম্পূর্ণ আপনার নিজের নিয়ন্ত্রণে — অন রাখলে অন্যরা আপনাকে "Available now" হিসেবে দেখবে এবং যোগাযোগ করতে পারবে।',
      },
      {
        q: 'আমি টগল অন রেখেছি, তবুও প্রোফাইলে "Not available" দেখাচ্ছে কেন?',
        a: 'আপনার সর্বশেষ রক্তদানের তারিখ থেকে এখনো ১২০ দিন পার হয়নি বলে। মেডিকেল নিরাপত্তার জন্য, আপনার পরবর্তী যোগ্য তারিখ না আসা পর্যন্ত অন্যরা আপনাকে "Available" হিসেবে দেখতে পাবেন না বা আপনার নম্বর দেখতে পারবেন না, even যদি আপনার নিজের টগল "on" থাকে। আপনার প্রোফাইলে ঠিক কোন তারিখ থেকে আবার available দেখাবে তা লেখা থাকে।',
      },
      {
        q: 'কারো ফোন নম্বর দেখতে কী লাগে?',
        a: 'সাইন-ইন করা থাকতে হবে, এবং সেই দাতা অবশ্যই "Available Now" (এবং যোগ্য) হতে হবে। সপ্তাহে সর্বোচ্চ ১০ জন দাতার নম্বর দেখা যায় — এই সীমা অপব্যবহার ঠেকাতে। সীমা শেষ হয়ে গেলে পরের সপ্তাহ পর্যন্ত অপেক্ষা করতে হয়। নিজের নম্বর নিজে "reveal" করা যায় না, প্রয়োজনও নেই।',
      },
      {
        q: 'নম্বর দেখার পর কীভাবে যোগাযোগ করব?',
        a: 'নম্বর দেখানোর পর সরাসরি কল অথবা হোয়াটসঅ্যাপ মেসেজ বাটন পাবেন (যদি ঐ দাতা হোয়াটসঅ্যাপ নম্বর দিয়ে থাকেন)।',
      },
    ],
  },
  {
    title: 'রক্তের অনুরোধ ও নোটিফিকেশন',
    items: [
      {
        q: 'রক্তের অনুরোধ পোস্ট করলে কী হয়?',
        a: 'আপনার প্রয়োজনীয় ব্লাড গ্রুপ, জেলা, প্রয়োজনীয় ব্যাগ সংখ্যা এবং জরুরিতার মাত্রা (🚨 Critical / ⚠️ High / ℹ️ Medium) দিয়ে অনুরোধ তৈরি হয়। যেসব দাতা ম্যাচিং ব্লাড গ্রুপের, এই মুহূর্তে সত্যিকারভাবে available, এবং সাধারণত একই জেলার — তারা সাথে সাথে একটি নোটিফিকেশন পান।',
      },
      {
        q: '"Critical" মার্ক করলে আলাদা কী হয়?',
        a: 'Critical (🚨) অনুরোধ শুধু নিজের জেলার দাতাদের কাছে নয় — সারা দেশের ম্যাচিং, available দাতাদের কাছে নোটিফিকেশন যায়। এটি সত্যিকারের জরুরি পরিস্থিতির জন্য রাখা উচিত।',
      },
      {
        q: 'নোটিফিকেশন বেল আইকনে কী দেখায়?',
        a: 'আপনার ব্লাড গ্রুপের সাথে ম্যাচিং নতুন অনুরোধ, আপনার প্রতিশ্রুতি সংক্রান্ত আপডেট (যেমন কেউ আপনার দান নিশ্চিত করেছে), এবং সাইনইন করা অবস্থায় থাকলে রিয়েল-টাইমে দেখা যায় — পেজ রিফ্রেশ করারও দরকার নেই।',
      },
    ],
  },
  {
    title: 'রক্তদান নিশ্চিতকরণ ও পয়েন্ট',
    items: [
      {
        q: 'রক্ত দেওয়ার পর কীভাবে সেটা রেকর্ড হয়?',
        a: 'তিনটি ধাপে: (১) আপনি একটি অনুরোধে "Offer to Donate" চাপেন। (২) যিনি অনুরোধ করেছিলেন, তিনি বাস্তবে রক্ত পাওয়ার পর সেটা লগ করেন। (৩) আপনি নিজে সেই দানটি "Confirm" করেন। শুধু আপনার নিজের নিশ্চিতকরণের পরেই আপনার পয়েন্ট, "lives saved" গণনা এবং পরবর্তী যোগ্য তারিখ আপডেট হয় — অর্থাৎ কেউ আপনার অনুমতি ছাড়া আপনার নামে দান "বসিয়ে" দিতে পারে না।',
      },
      {
        q: 'একটি নিশ্চিত দানে কী পাই?',
        a: '+১৫০ Roktobondhu পয়েন্ট, "lives saved" সংখ্যায় +১, আপনার সর্বশেষ রক্তদানের তারিখ সেই দানের তারিখে সেট হয়ে যায়, এবং আপনার "Available Now" স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যায় যতক্ষণ না ১২০ দিন পার হয়।',
      },
      {
        q: 'হাসপাতাল বা এডমিন কি সরাসরি দান নিশ্চিত করতে পারে?',
        a: 'হ্যাঁ — hospital বা admin রোলের ব্যবহারকারীরা একটি দান সরাসরি ভেরিফাই করে একই পয়েন্ট/লাইভ-সেভড/১২০-দিনের হিসাব চালু করতে পারেন, দাতার নিজের কনফার্মেশনের অপেক্ষা ছাড়াই — যেমন হাসপাতালে সরাসরি রক্তদান হলে।',
      },
    ],
  },
  {
    title: 'রিওয়ার্ডস, লিডারবোর্ড ও অন্যান্য',
    items: [
      {
        q: 'Rewards ট্যাবে কী আছে?',
        a: 'আপনার মোট Roktobondhu পয়েন্ট, অর্জিত ব্যাজসমূহ, এবং সবচেয়ে বেশি অবদান রাখা দাতাদের লিডারবোর্ড। পয়েন্ট বাড়ার সাথে সাথে নতুন ব্যাজ আনলক হয়।',
      },
      {
        q: 'Success Stories ট্যাবে কী দেখা যায়?',
        a: 'প্রতিটি নিশ্চিত হওয়া রক্তদান এখানে দেখা যায় — কে দান করেছেন, কতটুকু, এবং কার জন্য (রোগীর নাম সংক্ষিপ্ত/বেনামে দেখানো হয় গোপনীয়তার জন্য)।',
      },
      {
        q: 'আমার তথ্য কতটা নিরাপদ?',
        a: 'আপনার ঠিকানার সঠিক স্থানাঙ্ক (lat/lng) পাবলিকভাবে প্রকাশিত হয় না — শুধু আনুমানিক এলাকা দেখানো হয়। ফোন নম্বর শুধুমাত্র সাইন-ইন করা ব্যবহারকারীরা, সীমিত সংখ্যক বার, দেখতে পান। স্বাস্থ্য তথ্য কখনও অন্য কারো কাছে প্রকাশিত হয় না।',
      },
    ],
  },
];

export const FaqSection: React.FC = () => {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section className="p-6 lg:p-10 lg:overflow-hidden flex flex-col lg:h-full bg-white dark:bg-slate-900 min-w-0">
      <header className="mb-8">
        <h1 className="editorial-title text-4xl sm:text-6xl text-slate-900 dark:text-slate-100 leading-none mb-3 whitespace-nowrap">
          কীভাবে <span className="text-rose-600 dark:text-rose-400">কাজ করে।</span>
        </h1>
        <p className="text-slate-400 font-bold max-w-lg uppercase text-[11px] tracking-widest">
          Roktobondhu Bangladesh সম্পর্কে সবচেয়ে বেশি জিজ্ঞাসিত প্রশ্ন
        </p>
      </header>

      <div className="flex-1 overflow-y-auto pr-2 custom-scroll pb-12 space-y-8">
        {FAQ_GROUPS.map(group => (
          <div key={group.title}>
            <h2 className="text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-3">{group.title}</h2>
            <div className="space-y-2.5">
              {group.items.map(item => {
                const key = `${group.title}::${item.q}`;
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
            আপনার প্রশ্নের উত্তর এখানে না পেলে ফুটারে দেওয়া ইমেইলে যোগাযোগ করুন।
          </p>
        </div>
      </div>
    </section>
  );
};
