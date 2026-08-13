import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface SeriesPoint {
  value: number;
  date: string;
}

export interface ChartSeries {
  name: string;
  data: SeriesPoint[];
  color: string;
}

export interface MetricSeries {
  name: string;
  data: SeriesPoint[];
  accent?: MetricAccent;
}

export type ChartView = 'curve' | 'area';
export type MetricAccent = 'emerald' | 'rose' | 'neutral' | 'blue' | 'amber' | 'purple';

export const SERIES_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
];

export const ACCENTS: Record<
  MetricAccent,
  {
    stroke: string;
    fill: string;
    text: string;
    bg: string;
  }
> = {
  emerald: {
    stroke: '#10b981',
    fill: '#d1fae5',
    text: '#059669',
    bg: '#ecfdf5',
  },
  rose: {
    stroke: '#ef4444',
    fill: '#fee2e2',
    text: '#dc2626',
    bg: '#fef2f2',
  },
  neutral: {
    stroke: '#6b7280',
    fill: '#f3f4f6',
    text: '#374151',
    bg: '#f9fafb',
  },
  blue: {
    stroke: '#3b82f6',
    fill: '#dbeafe',
    text: '#1d4ed8',
    bg: '#eff6ff',
  },
  amber: {
    stroke: '#f59e0b',
    fill: '#fef3c7',
    text: '#d97706',
    bg: '#fffbeb',
  },
  purple: {
    stroke: '#8b5cf6',
    fill: '#ede9fe',
    text: '#6d28d9',
    bg: '#faf5ff',
  },
};

export const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toString();
};

interface MetricChartProps {
  series: ChartSeries[];
  view: ChartView;
  defaultIndex?: number;
  valueFormatter?: (value: number) => string;
  dateFormatter?: (date: string) => string;
}

export function MetricChart({
  series,
  view,
  valueFormatter,
  dateFormatter,
}: MetricChartProps) {
  if (!series[0]?.data.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Sem dados disponíveis</p>
      </div>
    );
  }

  // Transforma dados para recharts
  const chartData = series[0].data.map((point) => ({
    date: dateFormatter ? dateFormatter(point.date) : point.date,
    value: point.value,
    fullValue: point.value,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
        <p className="text-xs font-medium text-gray-800">{payload[0].payload.date}</p>
        <p className="text-sm font-semibold" style={{ color: payload[0].color }}>
          {valueFormatter ? valueFormatter(payload[0].value) : payload[0].value}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {view === 'area' ? (
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={series[0].color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={series[0].color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={series[0].color}
            fill="url(#colorGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      ) : (
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={series[0].color}
            dot={{ r: 4, fill: series[0].color, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
            strokeWidth={2}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
