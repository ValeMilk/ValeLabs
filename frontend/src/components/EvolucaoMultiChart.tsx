import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  COR_SERIE_EXCEDENTE,
  PALETA_SERIES,
  VERMELHO,
  criarRotuladorDeData,
} from '../lib/chart';

export interface PontoMulti {
  data: string;
  resultado: number;
  status: string;
  microrganismo: string;
  lote?: string;
  unidade?: string;
}

interface EvolucaoMultiChartProps {
  historico: PontoMulti[];
  /** Lista completa e estável de microrganismos — define a cor de cada série. */
  microrganismos: string[];
}

export function EvolucaoMultiChart({ historico, microrganismos }: EvolucaoMultiChartProps) {
  if (historico.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">Ainda não há análises lidas.</p>;
  }

  const corDe = (micro: string) => {
    const i = microrganismos.indexOf(micro);
    return i >= 0 && i < PALETA_SERIES.length ? PALETA_SERIES[i] : COR_SERIE_EXCEDENTE;
  };

  // Nomes de microrganismo viram chaves sintéticas: o Recharts trata pontos no
  // dataKey como caminho aninhado, e "E. coli" quebraria a leitura do valor.
  const chaveDe = new Map(microrganismos.map((m, i) => [m, `s${i}`]));

  const rotulo = criarRotuladorDeData(historico.map((h) => h.data));

  // Uma linha por análise, com valor só na coluna do seu microrganismo. Assim
  // duas leituras no mesmo instante não colidem e cada série mantém seus pontos.
  const chartData = historico.map((h, i) => ({
    indice: i,
    dataLabel: rotulo.curto(h.data),
    dataCompleta: rotulo.completo(h.data),
    microrganismo: h.microrganismo,
    lote: h.lote,
    unidade: h.unidade,
    status: h.status,
    [chaveDe.get(h.microrganismo) ?? 'sX']: h.resultado,
  }));

  const valores = historico.map((h) => h.resultado);
  const maior = Math.max(...valores);
  const menor = Math.min(...valores);
  const padding = Math.max(maior, 1) * 0.1;
  const yMin = Math.min(0, menor) - padding;
  const yMax = maior + padding;

  // Só as séries realmente presentes no recorte atual são desenhadas.
  const seriesVisiveis = microrganismos.filter((m) => historico.some((h) => h.microrganismo === m));

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;
    const cor = corDe(payload.microrganismo);
    const reprovada = payload.status === 'REPROVADO';
    // A cor identifica o microrganismo; a reprovação vira um anel vermelho —
    // dois canais distintos para não sobrecarregar a cor.
    return (
      <circle
        cx={cx}
        cy={cy}
        r={reprovada ? 6 : 4}
        fill={cor}
        stroke={reprovada ? VERMELHO : '#fff'}
        strokeWidth={reprovada ? 2.5 : 2}
      />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload.find((p: any) => p.value !== null && p.value !== undefined);
    if (!item) return null;
    const ponto = item.payload;
    const reprovada = ponto.status === 'REPROVADO';
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="text-xs text-gray-500 mb-0.5">{ponto.dataCompleta}</p>
        <p className="text-xs font-medium" style={{ color: corDe(ponto.microrganismo) }}>
          {ponto.microrganismo}
        </p>
        {ponto.lote && <p className="text-xs text-gray-500">Lote {ponto.lote}</p>}
        <p className="font-semibold text-gray-900">
          {item.value} {ponto.unidade}
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
            <YAxis domain={[yMin, yMax]} tick={{ fontSize: 12, fill: '#6b7280' }} width={56} />
            <Tooltip content={<CustomTooltip />} />

            {seriesVisiveis.map((micro) => (
              <Line
                key={micro}
                dataKey={chaveDe.get(micro)}
                name={micro}
                stroke={corDe(micro)}
                strokeWidth={2}
                connectNulls
                dot={<CustomDot />}
                activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda: identidade por nome, nunca só por cor */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-gray-200">
        {seriesVisiveis.map((micro) => (
          <div key={micro} className="flex items-center gap-2">
            <span className="w-6 h-0.5 rounded" style={{ backgroundColor: corDe(micro) }} />
            <span className="text-xs text-gray-600">{micro}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <span
            className="w-3.5 h-3.5 rounded-full bg-gray-300"
            style={{ boxShadow: `0 0 0 2px ${VERMELHO}` }}
          />
          <span className="text-xs text-gray-600">Ponto com anel vermelho = reprovada</span>
        </div>
      </div>
    </>
  );
}
