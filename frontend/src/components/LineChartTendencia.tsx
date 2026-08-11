import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TendenciaAgregada } from '../types/shared-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LineChartTendenciaProps {
  data: TendenciaAgregada[];
  titulo: string;
}

const CORES = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1', // indigo
];

export function LineChartTendencia({ data, titulo }: LineChartTendenciaProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    );
  }

  // Agrupar dados por data
  const dataAgrupada: Record<string, Record<string, any>> = {};

  data.forEach((item) => {
    const dataStr = format(new Date(item.data), 'dd/MM/yyyy', { locale: ptBR });
    if (!dataAgrupada[dataStr]) {
      dataAgrupada[dataStr] = { data: dataStr };
    }
    dataAgrupada[dataStr][item.microrganismo] = item.percentualAprovacao;
  });

  const chartData = Object.values(dataAgrupada);

  // Obter lista única de microrganismos
  const microrganismos = Array.from(
    new Set(data.map((d) => d.microrganismo))
  );

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">{titulo}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="data" />
          <YAxis domain={[0, 100]} label={{ value: '% Aprovação', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
          {microrganismos.map((micro, idx) => (
            <Line
              key={micro}
              type="monotone"
              dataKey={micro}
              stroke={CORES[idx % CORES.length]}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
