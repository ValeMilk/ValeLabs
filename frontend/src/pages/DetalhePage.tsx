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
const VERMELHO = '#E24B4A';
const VERDE_ESCURO = '#166534';
const VERMELHO_ESCURO = '#991B1B';

interface ChartPonto {
  dataLabel: string;
  resultado: number;
  status: string;
  dentroFaixa: boolean;
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

  const dentroFaixa = (resultado: number) =>
    !padrao || (resultado >= padrao.limiteMinimo && resultado <= padrao.limiteMaximo);

  const chartData: ChartPonto[] = historico.map((h) => ({
    dataLabel: formatarData(h.data),
    resultado: h.resultado,
    status: h.status,
    dentroFaixa: dentroFaixa(h.resultado),
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

  // Segmentos coloridos: azul quando ambas as pontas estão dentro da faixa, vermelho caso contrário.
  const segmentos = chartData.slice(1).map((ponto, i) => {
    const anterior = chartData[i];
    const foraDaFaixa = !ponto.dentroFaixa || !anterior.dentroFaixa;
    return { data: [anterior, ponto], cor: foraDaFaixa ? VERMELHO : AZUL };
  });

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;
    const cor = payload.status === 'REPROVADO' ? VERMELHO : AZUL;
    return <circle cx={cx} cy={cy} r={5} fill={cor} stroke="#fff" strokeWidth={2} />;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const ponto: ChartPonto = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-gray-900">
          {ponto.resultado} {padrao?.unidade}
        </p>
        <p className={ponto.status === 'REPROVADO' ? 'text-red-600' : 'text-green-600'}>
          {ponto.status === 'REPROVADO' ? 'Reprovada' : 'Aprovada'}
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
        <div className="bg-amber-50 rounded-lg shadow-sm border border-amber-200 p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Aguardando leitura</p>
          <p className="text-2xl font-bold text-amber-700">{kpis.aguardando}</p>
        </div>
      </div>

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
                <XAxis dataKey="dataLabel" tick={{ fontSize: 12, fill: '#6b7280' }} />
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

                {segmentos.map((s, i) => (
                  <Line
                    key={i}
                    data={s.data}
                    dataKey="resultado"
                    stroke={s.cor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                ))}
                <Line
                  data={chartData}
                  dataKey="resultado"
                  stroke="transparent"
                  dot={<CustomDot />}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
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
