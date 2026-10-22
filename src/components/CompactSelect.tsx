import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CompactSelectProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

export const CompactSelect: React.FC<CompactSelectProps> = ({ value, options, onChange, className = '', id }) => {
  const [open, setOpen] = useState(false);
  // Where the list fits: below by default, above when the visible space
  // below (window or the nearest scrolling ancestor, e.g. the sidebar) is short.
  const [placement, setPlacement] = useState<{ up: boolean; maxHeight: number }>({ up: false, maxHeight: 288 });
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let top = 0;
      let bottom = window.innerHeight;
      for (let el = containerRef.current.parentElement; el; el = el.parentElement) {
        if (/(auto|scroll|hidden)/.test(getComputedStyle(el).overflowY)) {
          const r = el.getBoundingClientRect();
          top = Math.max(top, r.top);
          bottom = Math.min(bottom, r.bottom);
        }
      }
      const below = bottom - rect.bottom - 12;
      const above = rect.top - top - 12;
      const up = below < 200 && above > below;
      setPlacement({ up, maxHeight: Math.max(144, Math.min(288, up ? above : below)) });
    }
    setOpen(current => !current);
  };

  // Show the selected option without scrolling the page.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (list && active) list.scrollTop = active.offsetTop - list.clientHeight / 2 + active.clientHeight / 2;
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={toggle}
        className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-800 dark:text-slate-200 outline-hidden focus:border-rose-500 transition-colors cursor-pointer flex items-center justify-between gap-3 ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selected?.label || 'Select'}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          ref={listRef}
          style={{ maxHeight: placement.maxHeight }}
          className={`absolute left-0 right-0 z-30 overflow-y-auto overscroll-contain custom-scroll ${placement.up ? 'bottom-full mb-1' : 'top-full mt-1'} rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-xl`}
          role="listbox"
        >
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${option.value === value ? 'bg-rose-50 dark:bg-rose-950/40 font-bold text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              role="option"
              aria-selected={option.value === value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
