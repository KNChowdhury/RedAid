import React, { useEffect, useState } from 'react';

const OTHER = '__other__';

interface AreaFieldProps {
  areas: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  name?: string;
}

export const AreaField: React.FC<AreaFieldProps> = ({ areas, value, onChange, className, id, name }) => {
  const knownValue = areas.includes(value);
  const [customMode, setCustomMode] = useState(!knownValue && !!value);

  useEffect(() => {
    if (knownValue) setCustomMode(false);
  }, [knownValue]);

  if (customMode) {
    return (
      <div className="flex gap-2">
        <input
          id={id}
          name={name}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Type your area / mohalla name"
          className={className}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setCustomMode(false);
            onChange(areas[0] || '');
          }}
          className="shrink-0 px-3 text-xs font-bold text-slate-500 hover:text-rose-600"
        >
          List
        </button>
      </div>
    );
  }

  return (
    <select
      id={id}
      name={name}
      value={knownValue ? value : ''}
      onChange={e => {
        if (e.target.value === OTHER) {
          setCustomMode(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      {areas.map(area => <option key={area} value={area}>{area}</option>)}
      <option value={OTHER}>Other (type your own)</option>
    </select>
  );
};
