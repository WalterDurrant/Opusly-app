import { useState } from 'react';

interface Props {
  value: number;
  onChange: (hours: number) => void;
}

const PRESETS = [
  { label: '1 hr', hours: 1 },
  { label: '2 hrs', hours: 2 },
  { label: '3 hrs', hours: 3 },
];

export default function TimeChipSelector({ value, onChange }: Props) {
  const [customMode, setCustomMode] = useState(false);
  const [customVal, setCustomVal] = useState('');

  const isPreset = PRESETS.some(p => p.hours === value);

  function handleCustomSubmit(raw: string) {
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0) onChange(num);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map(p => (
        <button
          key={p.hours}
          onClick={() => { onChange(p.hours); setCustomMode(false); }}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
            !customMode && value === p.hours
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {p.label}
        </button>
      ))}
      {customMode ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="number"
            min="0.5"
            step="0.5"
            value={customVal}
            onChange={e => setCustomVal(e.target.value)}
            onBlur={() => handleCustomSubmit(customVal)}
            onKeyDown={e => { if (e.key === 'Enter') handleCustomSubmit(customVal); }}
            placeholder="hrs"
            className="w-16 px-2 py-2 rounded-xl border border-indigo-400 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-sm text-gray-500">hrs</span>
        </div>
      ) : (
        <button
          onClick={() => { setCustomMode(true); setCustomVal(isPreset ? '' : String(value)); }}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
            !isPreset && value > 0
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {!isPreset && value > 0 ? `${value} hrs` : 'Custom'}
        </button>
      )}
    </div>
  );
}
