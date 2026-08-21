import React from 'react';

/**
 * Donor avatar.
 *
 * We used to fetch cartoon faces from an external avatar service, seeded with
 * the person's name. Two problems with that:
 *
 *   1. The service guesses a face at random, so women were shown bearded men
 *      and men were shown women. For a real person's profile that reads as
 *      careless at best and insulting at worst.
 *   2. Every donor's name was sent to a third-party server on every page load.
 *      A blood network shouldn't leak its members' names to anyone.
 *
 * Initials solve both. They're generated here, they're never wrong about who
 * someone is, and they work offline. Anyone who uploads a real photo sees that
 * instead.
 */

// Muted, readable backgrounds. No blues that could be mistaken for a "verified"
// state, and nothing so bright it competes with the blood group on the card.
const PALETTE = [
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-amber-100', text: 'text-amber-800' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-orange-100', text: 'text-orange-800' },
  { bg: 'bg-slate-200', text: 'text-slate-700' }
];

/** Stable colour per person, so their avatar doesn't change between visits. */
function colourFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/**
 * First letter of the first two words. Works for Bengali script as well as
 * Latin, since it only ever takes whole characters.
 */
export function initialsOf(name?: string): string {
  const cleaned = (name || '').trim();
  if (!cleaned) return '?';

  const words = cleaned.split(/\s+/).filter(Boolean);
  const first = Array.from(words[0])[0] || '';
  const second = words.length > 1 ? Array.from(words[words.length - 1])[0] || '' : '';
  return (first + second).toUpperCase();
}

interface AvatarProps {
  name?: string;
  /** A real uploaded photo, if the person has one. */
  src?: string;
  /** Tailwind size classes, e.g. "w-12 h-12". */
  className?: string;
  /** Text size class to match the container. */
  textClassName?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  className = 'w-12 h-12',
  textClassName = 'text-sm'
}) => {
  const looksUploaded = !!src && !src.includes('dicebear');

  if (looksUploaded) {
    return (
      <img
        src={src}
        alt=""
        className={`${className} rounded-xl object-cover bg-slate-100 shrink-0`}
      />
    );
  }

  const { bg, text } = colourFor(name || 'user');

  return (
    <div
      className={`${className} ${bg} ${text} ${textClassName} rounded-xl shrink-0 flex items-center justify-center font-black select-none`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </div>
  );
};
