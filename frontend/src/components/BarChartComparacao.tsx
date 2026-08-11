import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { Analise } from '../types/shared-types';
import { StatusConformidade } from '../types/shared-types';

interface BarChartComparacaoProps {
  analises: Analise[];
  agruparPor: 'microrganismo' | 'produto';
  titulo: string;
}

interface DadoGrafico {
  identificador: string;
  resultado: number;
  limiteMaximo: number;
  status: StatusConformidade;
}

export function BarChartComparacao({
  analises,
  agruparPor,
  titulo,
}: BarChartComparacaoProps) {
  if (!analises || analises.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-500">Sem dados para exibir</p>
      </div>
    );
  }

  // Agrupar por identificador e pegar a última análise
  const mapa: Record<string, Analise> = {};

  analises.forEach((analise) => {
    const chave =
      agruparPor === 'microrganismo'
        ? analise.microrganismo
        : analise.produtoId;

    if (!mapa[chave]) {
      mapa[chave] = analise;
    } else {
      const dataAtual = new Date(mapa[chave].criadoEm).getTime();
      const dataNova = new Date(analise.criadoEm).getTime();
      if (dataNova > dataAtual) {
        mapa[chave] = analise;
      }
    }
  });

  // Converter para dados do gráfico e ordenar
  const chartData: DadoGrafico[] = Object.entries(mapa)
    .map(([identificador, analise]) => ({
      identificador,
      resultado:
        typeof analise.resultado === 'number' ? analise.resultado : 0,
      limiteMaximo: analise.padraoVigenteSnapshot?.limiteMaximo || 0,
      status: analise.statusConformidade,
    }))
    .sort((a, b) => b.resultado - a.resultado);

  // Encontrar o maior limite para a linha de referência
  const maiorLimite = Math.max(...chartData.map((d) => d.limiteMaximo));

  const getCorStatus = (status: StatusConformidade): string => {
    switch (status) {
      case StatusConformidade.APROVADO:
        return '#10b981'; // green
      case StatusConformidade.REPROVADO:
        return '#ef4444'; // red
      case StatusConformidade.PENDENTE:
        return '#eab308'; // yellow
      case StatusConformidade.SEM_PADRÃO:
        return '#f59e0b'; // amber
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">{titulo}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="identificador" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip />
          <Legend />
          <ReferenceLine
            y={maiorLimite}
            stroke="#d1d5db"
            strokeDasharray="5 5"
            label={{ value: 'Limite Máximo', position: 'insideTopRight', offset: -5 }}
          />
          <Bar 
            dataKey="resultado" 
            fill="#3b82f6" 
            name="Resultado"
            shape={<CustomBarShape data={chartData} />}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CustomBarShapeProps {
  [key: string]: any;
}

function CustomBarShape({ x = 0, y = 0, width = 0, height = 0, payload, data }: CustomBarShapeProps) {
  if (!payload) return null;

  const getCorStatus = (status: StatusConformidade): string => {
    switch (status) {
      case StatusConformidade.APROVADO:
        return '#10b981';
      case StatusConformidade.REPROVADO:
        return '#ef4444';
      case StatusConformidade.PENDENTE:
        return '#eab308';
      case StatusConformidade.SEM_PADRÃO:
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const cor = getCorStatus(payload.status);

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={cor}
      rx="8"
    />
  );
}
