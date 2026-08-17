import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AZUL,
  VERDE,
  VERMELHO,
  VERDE_ESCURO,
  VERMELHO_ESCURO,
  criarRotuladorDeData,
} from '../lib/chart';

export interface PontoHistorico {
  data: string;
  resultado: number;
  status: string;
  /** Presente no resumo do produto, onde o gráfico mistura microrganismos. */
  microrganismo?: string;
  lote?: string;
  unidade?: string;
}

interface ChartPonto {
  /** Categoria do eixo X: o índice garante unicidade mesmo com leituras no mesmo minuto. */
  indice: number;
  dataLabel: string;
  dataCompleta: string;
  resultado: number;
  status: string;
  microrganismo?: string;
  lote?: string;
  unidade?: string;
}

interface EvolucaoChartProps {
  historico: PontoHistorico[];
  /** Quando informado, desenha as linhas pontilhadas de mínimo e máximo. */
  padrao?: { limiteMinimo: number; limiteMaximo: number; unidade: string } | null;
}

export function EvolucaoChart({ historico, padrao }: EvolucaoChartProps) {
  if (historico.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">Ainda não há análises lidas.</p>;
  }

  const rotulo = criarRotuladorDeData(historico.map((h) => h.data));

  const chartData: ChartPonto[] = historico.map((h, i) => ({
    indice: i,
    dataLabel: rotulo.curto(h.data),
    dataCompleta: rotulo.completo(h.data),
    resultado: h.resultado,
    status: h.status,
    microrganismo: h.microrganismo,
    lote: h.lote,
    unidade: h.unidade,
  }));

  // Eixo Y dinâmico: padding proporcional ao maior valor entre padrão e dados reais.
  const valores = chartData.map((p) => p.resultado);
  const maiorResultado = Math.max(...valores);
  const menorResultado = Math.min(...valores);
  const limiteMax = padrao?.limiteMaximo ?? maiorResultado;
  const referencia = Math.max(limiteMax, maiorResultado, 1);
  const padding = referencia * 0.1;
  const yMin = Math.min(0, menorResultado) - padding;
  const yMax = Math.max(limiteMax, maiorResultado) + padding;

  const corDoStatus = (status: string) =>
    status === 'REPROVADO' ? VERMELHO : status === 'APROVADO' ? VERDE : '#9CA3AF';

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;
    return (
      <circle cx={cx} cy={cy} r={5} fill={corDoStatus(payload.status)} stroke="#fff" strokeWidth={2} />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const ponto: ChartPonto = payload[0].payload;
    const reprovada = ponto.status === 'REPROVADO';
    const unidade = ponto.unidade ?? padrao?.unidade ?? '';
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="text-xs text-gray-500 mb-0.5">{ponto.dataCompleta}</p>
        {ponto.microrganismo && (
          <p className="text-xs font-medium text-gray-700">{ponto.microrganismo}</p>
        )}
        {ponto.lote && <p className="text-xs text-gray-500">Lote {ponto.lote}</p>}
        <p className="font-semibold text-gray-900">
          {ponto.resultado} {unidade}
        </p>
        <p className={reprovada ? 'text-red-600' : 'text-green-600'}>
          {reprovada ? 'Reprovada' : 'Aprovada'}
        </p>
      </div>
    );
  };

  return (
    <>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 24, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="indice"
              type="category"
              tickFormatter={(i: number) => chartData[i]?.dataLabel ?? ''}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              minTickGap={16}
            />
            <YAxis domain={[yMin, yMax]} tick={{ fontSize: 12, fill: '#6b7280' }} width={48} />
            <Tooltip content={<CustomTooltip />} />

            {padrao && (
              <ReferenceLine
                y={padrao.limiteMaximo}
                stroke={VERDE_ESCURO}
                strokeDasharray="6 4"
                label={{
                  value: `Máx. (${padrao.limiteMaximo})`,
                  position: 'insideTopRight',
                  fill: VERDE_ESCURO,
                  fontSize: 12,
                }}
              />
            )}
            {padrao && padrao.limiteMinimo > 0 && (
              <ReferenceLine
                y={padrao.limiteMinimo}
                stroke={VERMELHO_ESCURO}
                strokeDasharray="6 4"
                label={{
                  value: `Mín. (${padrao.limiteMinimo})`,
                  position: 'insideBottomRight',
                  fill: VERMELHO_ESCURO,
                  fontSize: 12,
                }}
              />
            )}

            <Line
              dataKey="resultado"
              stroke={AZUL}
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
              isAnimationActive={false}
              legendType="none"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-5 mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border-2 border-white ring-1 ring-gray-200"
            style={{ backgroundColor: VERDE }}
          />
          <span className="text-xs text-gray-600">Aprovada</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border-2 border-white ring-1 ring-gray-200"
            style={{ backgroundColor: VERMELHO }}
          />
          <span className="text-xs text-gray-600">Reprovada</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-0.5 rounded" style={{ backgroundColor: AZUL }} />
          <span className="text-xs text-gray-600">Resultado</span>
        </div>
      </div>
    </>
  );
}
