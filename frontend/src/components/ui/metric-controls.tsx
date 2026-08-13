import { BarChart3, TrendingUp } from 'lucide-react';
import type { ChartView } from './metric-chart';

export interface PeriodOption {
  label: string;
  points?: number;
}

interface ViewToggleProps {
  value: ChartView;
  onChange: (view: ChartView) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onChange('curve')}
        className={`p-1.5 rounded transition-colors ${
          value === 'curve'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Linha"
      >
        <TrendingUp size={16} />
      </button>
      <button
        onClick={() => onChange('area')}
        className={`p-1.5 rounded transition-colors ${
          value === 'area'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Área"
      >
        <BarChart3 size={16} />
      </button>
    </div>
  );
}

interface PeriodSelectProps {
  value: string;
  options: PeriodOption[];
  onChange: (option: PeriodOption) => void;
  accentText?: string;
}

export function PeriodSelect({
  value,
  options,
  onChange,
  accentText = '#3b82f6',
}: PeriodSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const option = options.find((o) => o.label === e.target.value);
        if (option) onChange(option);
      }}
      className="px-2 py-1 text-xs font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-0"
      style={{ color: accentText }}
    >
      {options.map((option) => (
        <option key={option.label} value={option.label}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
