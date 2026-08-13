import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { DashboardCategoria } from '../types/shared-types';
import { Criticidade } from '../types/shared-types';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Package,
  Clock,
  RefreshCw,
  Beaker,
  ArrowLeft,
} from 'lucide-react';
import ProgressMetricCard, { type SeriesPoint } from '../components/ui/progress-metric-card';

interface AnaliseData {
  data: string;
  total: number;
  aprovados: number;
  reprovados: number;
  pendentes: number;
}

export function DashboardPage() {
  const [categorias, setCategorias] = useState<DashboardCategoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [viewDetalhe, setViewDetalhe] = useState<string | null>(null);
  const [analisesDetalhe, setAnalisesDetalhe] = useState<AnaliseData[]>([]);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    carregarCategorias();
  }, []);

  const carregarCategorias = async () => {
    try {
      setCarregando(true);
      setErro('');
      const response = await api.get('/dashboard/categorias');
      setCategorias(response.data.dados || []);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao carregar categorias');
    } finally {
      setCarregando(false);
    }
  };

  const carregarAnalisesDetalhe = async (categoria: string) => {
    try {
      setCarregandoDetalhe(true);
      setViewDetalhe(categoria);
      // Busca análises da categoria
      const response = await api.get('/analises', {
        params: { categoria }
      });
      
      // Agrupa análises por data
      const analises = response.data.dados || [];
      const agrupadoPorData: Record<string, AnaliseData> = {};
      
      analises.forEach((analise: any) => {
        const data = analise.data ? new Date(analise.data).toLocaleDateString('pt-BR') : 'sem data';
        if (!agrupadoPorData[data]) {
          agrupadoPorData[data] = {
            data,
            total: 0,
            aprovados: 0,
            reprovados: 0,
            pendentes: 0,
          };
        }
        agrupadoPorData[data].total += 1;
        if (analise.statusConformidade === 'APROVADO') {
          agrupadoPorData[data].aprovados += 1;
        } else if (analise.statusConformidade === 'REPROVADO') {
          agrupadoPorData[data].reprovados += 1;
        } else {
          agrupadoPorData[data].pendentes += 1;
        }
      });
      
      setAnalisesDetalhe(Object.values(agrupadoPorData).sort((a, b) => 
        new Date(a.data).getTime() - new Date(b.data).getTime()
      ));
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao carregar detalhe');
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  const criticidadeStyle = (criticidade: Criticidade) => {
    switch (criticidade) {
      case Criticidade.CRÍTICO:
        return {
          badge: 'bg-red-100 text-red-700',
          bar: 'bg-red-600',
          border: 'border-l-red-600',
          icon: <AlertCircle className="text-red-600" size={20} />,
          label: 'Crítico',
        };
      case Criticidade.ATENÇÃO:
        return {
          badge: 'bg-yellow-100 text-yellow-800',
          bar: 'bg-yellow-500',
          border: 'border-l-yellow-500',
          icon: <AlertTriangle className="text-yellow-600" size={20} />,
          label: 'Atenção',
        };
      default:
        return {
          badge: 'bg-green-100 text-green-700',
          bar: 'bg-green-600',
          border: 'border-l-green-600',
          icon: <CheckCircle className="text-green-600" size={20} />,
          label: 'Conforme',
        };
    }
  };

  // Visão detalhe: gráfico de linha temporal da categoria
  if (viewDetalhe) {
    const categoria = categorias.find(c => c.categoria === viewDetalhe);
    
    // Prepara dados para ProgressMetricCard
    const totalSeriesData: SeriesPoint[] = analisesDetalhe.map(d => ({
      value: d.total,
      date: d.data,
    }));
    
    const aprovadosSeriesData: SeriesPoint[] = analisesDetalhe.map(d => ({
      value: d.aprovados,
      date: d.data,
    }));
    
    const reprovadosSeriesData: SeriesPoint[] = analisesDetalhe.map(d => ({
      value: d.reprovados,
      date: d.data,
    }));

    return (
      <div className="max-w-7xl mx-auto">
        {/* Botão voltar */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setViewDetalhe(null)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{viewDetalhe}</h1>
          {categoria && (
            <div className="ml-auto flex gap-2">
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                ✓ {categoria.aprovadas} aprovadas
              </div>
              <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                ✗ {categoria.reprovadas} reprovadas
              </div>
              <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                ⏳ {categoria.aguardandoLeitura} aguardando
              </div>
            </div>
          )}
        </div>

        {/* Cards de métrica */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ProgressMetricCard
            title="Total de Análises"
            data={totalSeriesData}
            size="md"
            accent="blue"
            loading={carregandoDetalhe}
            valueFormatter={(v) => Math.round(v).toString()}
            dateFormatter={(d) => new Date(d).toLocaleDateString('pt-BR')}
          />
          <ProgressMetricCard
            title="Análises Aprovadas"
            data={aprovadosSeriesData}
            size="md"
            accent="emerald"
            loading={carregandoDetalhe}
            valueFormatter={(v) => Math.round(v).toString()}
            dateFormatter={(d) => new Date(d).toLocaleDateString('pt-BR')}
          />
          <ProgressMetricCard
            title="Análises Reprovadas"
            data={reprovadosSeriesData}
            size="md"
            accent="rose"
            loading={carregandoDetalhe}
            valueFormatter={(v) => Math.round(v).toString()}
            dateFormatter={(d) => new Date(d).toLocaleDateString('pt-BR')}
          />
        </div>
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalAnalises = categorias.reduce((s, c) => s + c.totalAnalises, 0);
  const totalLidas = categorias.reduce((s, c) => s + c.lidas, 0);
  const totalAprovadas = categorias.reduce((s, c) => s + c.aprovadas, 0);
  const totalReprovadas = categorias.reduce((s, c) => s + c.reprovadas, 0);
  const totalAguardando = categorias.reduce((s, c) => s + c.aguardandoLeitura, 0);
  const totalAtrasadas = categorias.reduce((s, c) => s + c.atrasadas, 0);
  const totalInoculadas = categorias.reduce((s, c) => s + c.inoculadas, 0);

  return (
    <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-500">
              Acompanhamento microbiológico dinâmico
            </p>
          </div>
          <button
            onClick={carregarCategorias}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <RefreshCw size={16} />
            <span>Atualizar</span>
          </button>
        </div>

        {erro && (
          <div className="mb-6 bg-red-50 border border-red-300 rounded-lg p-3 flex items-center space-x-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-800 text-sm">{erro}</p>
          </div>
        )}

        {/* Alertas de fluxo (ciclo) */}
        {totalAtrasadas > 0 && (
          <div className="mb-4 bg-orange-50 border border-orange-300 rounded-lg p-3 flex items-center space-x-3">
            <Clock className="text-orange-600" size={20} />
            <p className="text-orange-800 text-sm">
              <span className="font-semibold">{totalAtrasadas}</span> análise(s)
              com leitura atrasada — verifique fluxo de incubação.
            </p>
          </div>
        )}

        {/* Stats principais — Eixo Ciclo */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Fluxo de Análise
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<Package className="text-blue-600" size={22} />}
              label="Total"
              value={totalAnalises}
              color="border-l-blue-600"
            />
            <StatCard
              icon={<Beaker className="text-blue-600" size={22} />}
              label="Inoculadas"
              value={totalInoculadas}
              color="border-l-blue-500"
            />
            <StatCard
              icon={<Clock className="text-yellow-600" size={22} />}
              label="Aguardando Leitura"
              value={totalAguardando}
              extra={
                totalAtrasadas > 0
                  ? `${totalAtrasadas} atrasada(s)`
                  : undefined
              }
              extraColor="text-orange-600"
              color="border-l-yellow-500"
            />
            <StatCard
              icon={<CheckCircle className="text-gray-600" size={22} />}
              label="Lidas"
              value={totalLidas}
              color="border-l-gray-500"
            />
          </div>
        </div>

        {/* Stats — Eixo Conformidade */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Conformidade (apenas análises lidas)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon={<CheckCircle className="text-green-600" size={22} />}
              label="Aprovadas"
              value={totalAprovadas}
              color="border-l-green-600"
              valueColor="text-green-700"
            />
            <StatCard
              icon={<AlertCircle className="text-red-600" size={22} />}
              label="Reprovadas"
              value={totalReprovadas}
              extra={
                totalLidas > 0
                  ? `${Math.round((totalReprovadas / totalLidas) * 100)}% do total lido`
                  : undefined
              }
              extraColor="text-red-600"
              color="border-l-red-600"
              valueColor="text-red-700"
            />
            <StatCard
              icon={<AlertTriangle className="text-purple-600" size={22} />}
              label="Sem Padrão"
              value={categorias.reduce((s, c) => s + c.semPadrao, 0)}
              color="border-l-purple-600"
              valueColor="text-purple-700"
            />
          </div>
        </div>

        {/* Categorias */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Categorias de Produtos
          </h2>
          <span className="text-xs text-gray-500">
            {categorias.length} categoria(s)
          </span>
        </div>

        {categorias.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center border border-gray-100">
            <Beaker className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-700 font-medium">
              Nenhuma categoria encontrada
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Cadastre lançamentos para popular o dashboard
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorias.map((cat) => {
              const style = criticidadeStyle(cat.criticidade);
              const taxaAprovacao =
                cat.lidas > 0
                  ? Math.round((cat.aprovadas / cat.lidas) * 100)
                  : 0;

              return (
                <div
                  key={cat.categoria}
                  onClick={() => carregarAnalisesDetalhe(cat.categoria)}
                  className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-5 border-l-4 ${style.border} cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">
                        {cat.categoria}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {cat.totalAnalises} análise(s)
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${style.badge} flex items-center space-x-1`}
                    >
                      {style.icon}
                      <span>{style.label}</span>
                    </span>
                  </div>

                  {/* Taxa de aprovação (só das lidas) */}
                  {cat.lidas > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">
                          Taxa de aprovação (lidas)
                        </span>
                        <span className="text-xs font-bold text-gray-800">
                          {taxaAprovacao}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`${style.bar} h-1.5 rounded-full transition-all`}
                          style={{ width: `${taxaAprovacao}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Grid de contadores */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <MiniStat
                      label="Aprovadas"
                      value={cat.aprovadas}
                      valueClass="text-green-700"
                      bg="bg-green-50"
                    />
                    <MiniStat
                      label="Reprovadas"
                      value={cat.reprovadas}
                      valueClass="text-red-700"
                      bg="bg-red-50"
                    />
                    <MiniStat
                      label="Aguardando"
                      value={cat.aguardandoLeitura}
                      valueClass="text-yellow-700"
                      bg="bg-yellow-50"
                    />
                    <MiniStat
                      label="Inoculadas"
                      value={cat.inoculadas}
                      valueClass="text-blue-700"
                      bg="bg-blue-50"
                    />
                  </div>

                  {(cat.atrasadas > 0 || cat.semPadrao > 0) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                      {cat.atrasadas > 0 && (
                        <div className="flex items-center space-x-2 text-xs text-orange-700">
                          <Clock size={14} />
                          <span>
                            <span className="font-semibold">
                              {cat.atrasadas}
                            </span>{' '}
                            leitura(s) atrasada(s)
                          </span>
                        </div>
                      )}
                      {cat.semPadrao > 0 && (
                        <div className="flex items-center space-x-2 text-xs text-purple-700">
                          <AlertTriangle size={14} />
                          <span>
                            <span className="font-semibold">
                              {cat.semPadrao}
                            </span>{' '}
                            sem padrão cadastrado
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  extra?: string;
  extraColor?: string;
  color: string;
  valueColor?: string;
}

function StatCard({
  icon,
  label,
  value,
  extra,
  extraColor,
  color,
  valueColor,
}: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow p-4 border-l-4 ${color} flex items-center justify-between`}
    >
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p
          className={`text-2xl font-bold mt-1 ${valueColor || 'text-gray-800'}`}
        >
          {value}
        </p>
        {extra && (
          <p className={`text-xs font-medium mt-0.5 ${extraColor}`}>{extra}</p>
        )}
      </div>
      <div>{icon}</div>
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: number;
  valueClass: string;
  bg: string;
}

function MiniStat({ label, value, valueClass, bg }: MiniStatProps) {
  return (
    <div className={`${bg} rounded p-2`}>
      <p className="text-xs text-gray-600">{label}</p>
      <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
