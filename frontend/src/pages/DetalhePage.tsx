import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ArrowLeft, CheckCircle, Clock, ListX, XCircle } from 'lucide-react';
import { api } from '../services/api';
import type { DashboardDetalhe } from '../types/shared-types';
import { formatarData } from '../types/shared-types';

const AZUL = '#2a78d6';
const VERDE = '#16A34A';
const VERMELHO = '#E24B4A';
const VERDE_ESCURO = '#166534';
const VERMELHO_ESCURO = '#991B1B';

interface ChartPonto {
  /** Categoria do eixo X: o índice garante unicidade mesmo com leituras no mesmo minuto. */
  indice: number;
  dataLabel: string;
  dataCompleta: string;
  resultado: number;
  status: string;
}

export function DetalhePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const produto = searchParams.get('produto') || '';
  const micro = searchParams.get('micro') || '';

  const [dados, setDados] = useState<DashboardDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!produto || !micro) {
      navigate('/dashboard');
      return;
    }
    carregar();
  }, [produto, micro]);

  const carregar = async () => {
    try {
      setCarregando(true);
      setErro('');
      const response = await api.get('/dashboard/detalhe', { params: { produto, micro } });
      setDados(response.data.dados);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao carregar detalhe');
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (erro || !dados) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
        <p className="text-gray-700 font-medium">{erro || 'Par não encontrado'}</p>
      </div>
    );
  }

  const { categoria, padrao, kpis, historico, tabela } = dados;

  // Eixo X adaptativo: quando várias análises caem no mesmo dia, a data sozinha
  // não distingue os pontos — nesse caso o rótulo passa a incluir a hora.
  const diasDistintos = new Set(historico.map((h) => new Date(h.data).toDateString()));
  const horaDeLeitura = (data: string) =>
    new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const rotuloEixoX = (data: string) => {
    if (diasDistintos.size <= 1) return horaDeLeitura(data);
    if (diasDistintos.size < historico.length) {
      const d = new Date(data);
      return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${horaDeLeitura(data)}`;
    }
    return formatarData(data);
  };

  const chartData: ChartPonto[] = historico.map((h, i) => ({
    indice: i,
    dataLabel: rotuloEixoX(h.data),
    dataCompleta: `${formatarData(h.data)} ${horaDeLeitura(h.data)}`,
    resultado: h.resultado,
    status: h.status as string,
  }));

  // Eixo Y dinâmico: padding proporcional ao maior valor entre padrão e dados reais.
  const valores = chartData.map((p) => p.resultado);
  const maiorResultado = valores.length ? Math.max(...valores) : padrao?.limiteMaximo ?? 0;
  const menorResultado = valores.length ? Math.min(...valores) : 0;
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
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="text-xs text-gray-500 mb-0.5">{ponto.dataCompleta}</p>
        <p className="font-semibold text-gray-900">
          {ponto.resultado} {padrao?.unidade}
        </p>
        <p className={reprovada ? 'text-red-600' : 'text-green-600'}>
          {reprovada ? 'Reprovada' : 'Aprovada'}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={16} />
        Voltar ao mapa de calor
      </button>

      <h1 className="text-3xl font-bold text-gray-900">
        {produto} × {micro}
      </h1>
      <p className="text-gray-600 mb-8">
        {categoria}
        {padrao && (
          <>
            {' · '}Padrão: mín. {padrao.limiteMinimo} {padrao.unidade} · máx. {padrao.limiteMaximo} {padrao.unidade}
          </>
        )}
      </p>

      {/* KPIs do par */}
      {(() => {
        const taxaReprovacao = kpis.total > 0 ? ((kpis.reprovadas / kpis.total) * 100).toFixed(1) : '0.0';
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Total analisadas</p>
              <p className="text-2xl font-bold text-blue-600">{kpis.total}</p>
            </div>
            <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Aprovadas</p>
              <p className="text-2xl font-bold text-green-700">{kpis.aprovadas}</p>
            </div>
            <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Reprovadas</p>
              <p className="text-2xl font-bold text-red-700">{kpis.reprovadas}</p>
            </div>
            <div className="bg-orange-50 rounded-lg shadow-sm border border-orange-200 p-4">
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">Taxa de reprovação</p>
              <p className="text-2xl font-bold text-orange-700">{taxaReprovacao}%</p>
            </div>
          </div>
        );
      })()}

      {/* Gráfico de evolução */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
          Evolução dos resultados
        </h2>
        {chartData.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">Ainda não há análises lidas para este par.</p>
        ) : (
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
                    label={{ value: `Máx. (${padrao.limiteMaximo})`, position: 'insideTopRight', fill: VERDE_ESCURO, fontSize: 12 }}
                  />
                )}
                {padrao && padrao.limiteMinimo > 0 && (
                  <ReferenceLine
                    y={padrao.limiteMinimo}
                    stroke={VERMELHO_ESCURO}
                    strokeDasharray="6 4"
                    label={{ value: `Mín. (${padrao.limiteMinimo})`, position: 'insideBottomRight', fill: VERMELHO_ESCURO, fontSize: 12 }}
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
        )}
        {chartData.length > 0 && (
          <div className="flex flex-wrap items-center gap-5 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-white ring-1 ring-gray-200" style={{ backgroundColor: VERDE }} />
              <span className="text-xs text-gray-600">Aprovada</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-white ring-1 ring-gray-200" style={{ backgroundColor: VERMELHO }} />
              <span className="text-xs text-gray-600">Reprovada</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 rounded" style={{ backgroundColor: AZUL }} />
              <span className="text-xs text-gray-600">Resultado ({padrao?.unidade ?? 'valor'})</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabela histórica */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider px-6 pt-6 mb-4">
          Histórico de análises
        </h2>
        {tabela.length === 0 ? (
          <p className="text-gray-500 text-sm px-6 pb-6">Nenhuma análise registrada para este par.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Lote</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Data inoculação</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Data leitura</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Ponto de coleta</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Resultado</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Conformidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tabela.map((linha, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{linha.lote || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{formatarData(linha.dataInoculacao)}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {linha.dataLeitura ? formatarData(linha.dataLeitura) : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{linha.pontoColeta || '-'}</td>
                    <td className="px-6 py-3 text-sm">
                      {linha.resultado !== null ? (
                        <span className="text-gray-900 font-medium">
                          {linha.resultado} {padrao?.unidade}
                        </span>
                      ) : (
                        <span className="text-gray-400">Aguardando</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <ConformidadePill status={linha.statusConformidade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ConformidadePill({ status }: { status: string }) {
  if (status === 'APROVADO') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
        <CheckCircle size={12} /> Aprovada
      </span>
    );
  }
  if (status === 'REPROVADO') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
        <XCircle size={12} /> Reprovada
      </span>
    );
  }
  if (status === 'SEM_PADRÃO') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
        <ListX size={12} /> Sem padrão
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
      <Clock size={12} /> Pendente
    </span>
  );
}
