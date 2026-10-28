import { Ban } from 'lucide-react';
import React from 'react';
import { defineStrings, useStrings } from '../i18n';

const S = defineStrings(
  {
    title: 'Blood is never for sale',
    body: 'Taking or giving money for blood is a punishable offence. RedAid does not support it in any way. If anyone asks for money, report it to us.',
    policyLink: 'Read our policy'
  },
  {
    title: 'রক্ত কখনো বিক্রির জিনিস নয়',
    body: 'রক্তের বিনিময়ে টাকা নেওয়া বা দেওয়া দণ্ডনীয় অপরাধ। RedAid এটি কোনোভাবেই সমর্থন করে না। কেউ টাকা চাইলে আমাদের জানান।',
    policyLink: 'নীতিমালা পড়ুন'
  }
);

interface NoMoneyNoticeProps {
  onOpenPolicy?: () => void;
  className?: string;
}

/** One shared wording for the "no money for blood" rule, so every page says exactly the same thing. */
export const NoMoneyNotice: React.FC<NoMoneyNoticeProps> = ({ onOpenPolicy, className = '' }) => {
  const { s } = useStrings(S);

  return (
    <div
      role="note"
      className={`flex items-start gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-4 ${className}`}
    >
      <Ban className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-rose-800 dark:text-rose-300">{s.title}</p>
        <p className="text-xs sm:text-sm text-rose-900/80 dark:text-rose-200/80 mt-0.5 leading-relaxed">
          {s.body}
          {onOpenPolicy && (
            <>
              {' '}
              <button onClick={onOpenPolicy} className="font-bold underline underline-offset-2 hover:text-rose-600">
                {s.policyLink}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
