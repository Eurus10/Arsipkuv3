import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface PillStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  size?: 'sm' | 'md';
}

export const PillStepper: React.FC<PillStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
  size = 'md',
}) => {
  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = Math.max(min, value - step);
    onChange(next);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = Math.min(max, value + step);
    onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(min);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div
      className={`relative inline-flex items-center justify-between bg-slate-950/60 border border-white/10 rounded-full p-1 select-none transition-colors focus-within:border-indigo-400/70 focus-within:ring-1 focus-within:ring-indigo-500/30 ${
        isSmall ? 'h-8 px-1' : 'h-10 px-1'
      } ${className}`}
    >
      {/* Minus Button (Circular Dark Slate) */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Kurangi nilai"
        className={`${
          isSmall ? 'w-6 h-6' : 'w-8 h-8'
        } rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10 shrink-0`}
      >
        <Minus className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} stroke-[3] text-slate-200`} />
      </button>

      {/* Center Value Input / Display */}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleInputChange}
        className="w-full min-w-0 text-center font-extrabold text-white text-sm bg-transparent outline-none px-1 tabular-nums cursor-text"
      />

      {/* Plus Button (Circular Blue/Indigo Accent) */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Tambah nilai"
        className={`${
          isSmall ? 'w-6 h-6' : 'w-8 h-8'
        } rounded-full bg-indigo-500/80 hover:bg-indigo-500 active:scale-95 text-white flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-indigo-500/80 shrink-0`}
      >
        <Plus className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'} stroke-[3] text-white`} />
      </button>
    </div>
  );
};
