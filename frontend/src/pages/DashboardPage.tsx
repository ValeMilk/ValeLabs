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
  Home,
} from 'lucide-react';
import ProgressMetricCard, { type SeriesPoint } from '../components/ui/progress-metric-card';
import { motion } from 'framer-motion';

interface ProdutoData {
  nome: string;
  produtoId?: string;
  percentualReprovacao: number;
  historico: SeriesPoint[];
  microrganismos: MicroorganismoData[];
}

interface MicroorganismoData {
  nome: string;
  percentualReprovacao: number;
  historico: SeriesPoint[];
  mediaResultado?: number; // Média dos resultados para exibição
}

export function DashboardPage() {
  const [categorias, setCategorias] = useState<DashboardCategoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<ProdutoData[]>([]);
  const [microrganismos, setMicrorganismos] = useState<MicroorganismoData[]>([]);
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

  // Nível 2: Produtos de uma categoria
  const carregarProdutos = async (categoria: string) => {
    try {
      setCarregandoDetalhe(true);
      setCategoriaSelecionada(categoria);
      setProdutoSelecionado(null);
      
      const response = await api.get('/analises', {
        params: { categoria }
      });
      
      const analises = response.data.dados || [];
      const agrupadoProduto: Record<string, ProdutoData> = {};
      
      // Agrupa por produto
      analises.forEach((analise: any) => {
        const produtoNome = analise.produtoNome || 'Sem produto';
        if (!agrupadoProduto[produtoNome]) {
          agrupadoProduto[produtoNome] = {
            nome: produtoNome,
            produtoId: analise.produtoId,
            percentualReprovacao: 0,
            historico: [],
            microrganismos: [],
          };
        }
      });
      
      // Histórico por produto e data
      const historicoProduto: Record<string, Record<string, { total: number; reprovados: number }>> = {};
      const microsPorProduto: Record<string, Set<string>> = {};
      
      analises.forEach((analise: any) => {
        const produtoNome = analise.produtoNome || 'Sem produto';
        const data = analise.dataInoculacao ? new Date(analise.dataInoculacao).toLocaleDateString('pt-BR') : 'sem data';
        const microNome = analise.microrganismo || 'Desconhecido';
        
        if (!historicoProduto[produtoNome]) historicoProduto[produtoNome] = {};
        if (!historicoProduto[produtoNome][data]) {
          historicoProduto[produtoNome][data] = { total: 0, reprovados: 0 };
        }
        
        historicoProduto[produtoNome][data].total += 1;
        if (analise.statusConformidade === 'REPROVADO') {
          historicoProduto[produtoNome][data].reprovados += 1;
        }
        
        if (!microsPorProduto[produtoNome]) microsPorProduto[produtoNome] = new Set();
        microsPorProduto[produtoNome].add(microNome);
      });
      
      Object.keys(agrupadoProduto).forEach((produtoNome) => {
        const historicoDatas = historicoProduto[produtoNome] || {};
        const historico: SeriesPoint[] = Object.entries(historicoDatas).map(
          ([data, { reprovados, total }]) => ({
            value: total > 0 ? (reprovados / total) * 100 : 0,
            date: data,
          })
        );
        
        const totalReprovados = Object.values(historicoDatas).reduce((s, d) => s + d.reprovados, 0);
        const totalAnalises = Object.values(historicoDatas).reduce((s, d) => s + d.total, 0);
        
        agrupadoProduto[produtoNome].historico = historico.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        agrupadoProduto[produtoNome].percentualReprovacao = totalAnalises > 0 
          ? (totalReprovados / totalAnalises) * 100 
          : 0;
        agrupadoProduto[produtoNome].microrganismos = Array.from(microsPorProduto[produtoNome] || new Set()).map(m => ({
          nome: m,
          percentualReprovacao: 0,
          historico: [],
        }));
      });
      
      setProdutos(Object.values(agrupadoProduto));
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao carregar produtos');
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  // Nível 3: Microrganismos de um produto
  const carregarMicroorganismosProduto = async (categoria: string, produtoNome: string) => {
    try {
      setCarregandoDetalhe(true);
      setProdutoSelecionado(produtoNome);
      
      const response = await api.get('/analises', {
        params: { categoria }
      });
      
      const todasAsAnalises = response.data.dados || [];
      console.log('📊 Nível 3 - Todas as análises da categoria:', todasAsAnalises.length);
      
      // Filtrar apenas as análises do produto selecionado
      // Compatível com dados antigos (produtoId) e novos (produtoNome)
      const produtoAtual = produtos.find(p => p.nome === produtoNome);
      const analises = todasAsAnalises.filter((a: any) => 
        a.produtoNome === produtoNome || a.produtoId === produtoAtual?.produtoId
      );
      console.log('📊 Nível 3 - Análises filtradas para produto:', analises.length, { produtoNome, produtoAtual });
      console.log('📊 Nível 3 - Amostra de análises:', analises.slice(0, 3));
      
      const agrupadoMicro: Record<string, MicroorganismoData> = {};
      
      analises.forEach((analise: any) => {
        const microNome = analise.microrganismo || 'Desconhecido';
        if (!agrupadoMicro[microNome]) {
          agrupadoMicro[microNome] = {
            nome: microNome,
            percentualReprovacao: 0,
            historico: [],
          };
        }
      });
      
      console.log('📊 Nível 3 - Microrganismos encontrados:', Object.keys(agrupadoMicro));
      
      // Histórico: CADA ANÁLISE = 1 PONTO (resultado individual)
      analises.forEach((analise: any) => {
        const microNome = analise.microrganismo || 'Desconhecido';
        // Manter data em ISO format para que dateFormatter possa formatar
        const data = analise.dataInoculacao ? analise.dataInoculacao : new Date().toISOString();
        const resultado = parseFloat(analise.resultado ?? 0);
        
        // Adicionar ponto ao histórico (cada análise é um ponto)
        agrupadoMicro[microNome].historico.push({
          value: resultado,
          date: data
        });
      });
      
      console.log('📊 Nível 3 - Histórico (pontos por análise):', agrupadoMicro);
      
      // Calcular percentualReprovacao e ordenar histórico
      Object.keys(agrupadoMicro).forEach((microNome) => {
        // Ordenar histórico por data
        agrupadoMicro[microNome].historico = agrupadoMicro[microNome].historico.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Calcular percentualReprovacao do microrganismo
        const analisesDoMicro = analises.filter((a: any) => a.microrganismo === microNome);
        const totalReprovados = analisesDoMicro.filter((a: any) => a.statusConformidade === 'REPROVADO').length;
        const total = analisesDoMicro.length;
        
        agrupadoMicro[microNome].percentualReprovacao = total > 0 
          ? (totalReprovados / total) * 100 
          : 0;
        
        // Calcular média dos resultados
        const somaResultados = agrupadoMicro[microNome].historico.reduce((acc, ponto) => acc + ponto.value, 0);
        agrupadoMicro[microNome].mediaResultado = agrupadoMicro[microNome].historico.length > 0
          ? somaResultados / agrupadoMicro[microNome].historico.length
          : 0;
        
        console.log(`📊 Nível 3 - ${microNome}: ${agrupadoMicro[microNome].historico.length} análises, ${agrupadoMicro[microNome].percentualReprovacao.toFixed(1)}% reprovação, média: ${agrupadoMicro[microNome].mediaResultado?.toFixed(1)}`);
      });
      
      setMicrorganismos(Object.values(agrupadoMicro));
    } catch (err: any) {
      console.error('❌ Erro ao carregar microrganismos:', err);
      setErro(err.response?.data?.mensagem || 'Erro ao carregar microrganismos');
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

  // Nível 3: Microrganismos de um produto
  if (categoriaSelecionada && produtoSelecionado) {
    const produto = produtos.find(p => p.nome === produtoSelecionado);
    
    return (
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb + Voltar */}
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => setProdutoSelecionado(null)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
          <span className="text-gray-500">/</span>
          <button
            onClick={() => setCategoriaSelecionada(null)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {categoriaSelecionada}
          </button>
          <span className="text-gray-500">/</span>
          <h1 className="text-2xl font-bold text-gray-800">{produtoSelecionado}</h1>
        </div>

        {/* Cards de microrganismos com gráficos */}
        {carregandoDetalhe ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : microrganismos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Sem microrganismos para este produto</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {microrganismos.map((micro) => (
              <ProgressMetricCard
                key={micro.nome}
                title={micro.nome}
                total={micro.mediaResultado?.toFixed(1)}
                data={micro.historico}
                size="md"
                accent={
                  micro.percentualReprovacao > 50 
                    ? 'rose' 
                    : micro.percentualReprovacao > 25 
                    ? 'amber' 
                    : 'emerald'
                }
                loading={carregandoDetalhe}
                valueFormatter={(v) => `${v.toFixed(1)}`}
                dateFormatter={(d) => new Date(d).toLocaleDateString('pt-BR')}
                unit=""
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Nível 2: Produtos de uma categoria
  if (categoriaSelecionada) {
    const categoria = categorias.find(c => c.categoria === categoriaSelecionada);
    
    return (
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb + Voltar */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setCategoriaSelecionada(null)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            Voltar ao Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{categoriaSelecionada}</h1>
          {categoria && (
            <div className="ml-auto flex gap-2 text-sm">
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                ✓ {categoria.aprovadas}
              </div>
              <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                ✗ {categoria.reprovadas}
              </div>
            </div>
          )}
        </div>

        {/* Cards de produtos com gráficos */}
        {carregandoDetalhe ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Sem produtos nesta categoria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {produtos.map((produto) => (
              <div
                key={produto.nome}
                onClick={() => carregarMicroorganismosProduto(categoriaSelecionada, produto.nome)}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-600 p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{produto.nome}</h3>
                    <p className="text-sm text-gray-600">
                      {produto.microrganismos.length} microrganismo(s) | Taxa de reprovação: {produto.percentualReprovacao.toFixed(1)}%
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full font-bold text-sm ${
                    produto.percentualReprovacao > 50 
                      ? 'bg-red-100 text-red-700' 
                      : produto.percentualReprovacao > 25 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {produto.percentualReprovacao.toFixed(1)}%
                  </div>
                </div>

                {/* Mini gráfico inline */}
                {produto.historico.length >= 2 && (
                  <div className="mb-4 h-12">
                    <ProgressMetricCard
                      title=""
                      data={produto.historico}
                      size="sm"
                      accent={
                        produto.percentualReprovacao > 50 
                          ? 'rose' 
                          : produto.percentualReprovacao > 25 
                          ? 'amber' 
                          : 'emerald'
                      }
                      loading={false}
                      showStats={false}
                      valueFormatter={(v) => `${Math.round(v)}%`}
                      dateFormatter={(d) => new Date(d).toLocaleDateString('pt-BR')}
                    />
                  </div>
                )}

                {/* Lista de microrganismos */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {produto.microrganismos.map((micro) => (
                    <div 
                      key={micro.nome} 
                      onClick={() => carregarMicroorganismosProduto(categoriaSelecionada!, produto.nome)}
                      className="bg-gray-50 hover:bg-blue-50 rounded p-2 text-sm cursor-pointer transition-colors"
                    >
                      <p className="font-medium text-gray-800">{micro.nome}</p>
                      <p className="text-xs text-gray-600">Clique para detalhes</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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

  // Ordenar categorias por criticidade
  const categoriasOrdenadas = [...categorias].sort((a, b) => {
    const rankA = a.criticidade === Criticidade.CRÍTICO ? 3 : a.criticidade === Criticidade.ATENÇÃO ? 2 : 1;
    const rankB = b.criticidade === Criticidade.CRÍTICO ? 3 : b.criticidade === Criticidade.ATENÇÃO ? 2 : 1;
    return rankB - rankA;
  });

  // Função auxiliar para obter cor e ícone por criticidade
  const getCriticidadeConfig = (crit: Criticidade) => {
    switch (crit) {
      case Criticidade.CRÍTICO:
        return { color: 'bg-red-50 border-l-red-500', dot: 'bg-red-500', text: 'text-red-700', label: 'Crítico' };
      case Criticidade.ATENÇÃO:
        return { color: 'bg-amber-50 border-l-amber-500', dot: 'bg-amber-500', text: 'text-amber-700', label: 'Atenção' };
      default:
        return { color: 'bg-green-50 border-l-green-500', dot: 'bg-green-500', text: 'text-green-700', label: 'Conforme' };
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        className="w-72 bg-white border-r border-gray-200 overflow-y-auto sticky top-0 h-screen shadow-sm"
      >
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">Vale<span className="text-blue-600">Milk</span></h1>
          <p className="text-xs text-gray-500 mt-1">Acompanhamento Microbiológico</p>
        </div>

        {/* KPI Mini */}
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Resumo Geral</p>
          <div className="space-y-2">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-gray-600">Total de Análises</p>
              <p className="text-2xl font-bold text-blue-600">{totalAnalises}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <p className="text-xs text-gray-600">Aprovadas</p>
              <p className="text-xl font-bold text-green-600">{totalAprovadas}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
              <p className="text-xs text-gray-600">Reprovadas</p>
              <p className="text-xl font-bold text-red-600">{totalReprovadas}</p>
            </div>
          </div>
        </div>

        {/* Categorias Menu */}
        <div className="px-3 py-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 mb-3">Categorias</p>
          <div className="space-y-1">
            {categoriasOrdenadas.map((cat) => {
              const config = getCriticidadeConfig(cat.criticidade);
              return (
                <motion.button
                  key={cat.categoria}
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    carregarProdutos(cat.categoria);
                    setCategoriaSelecionada(cat.categoria);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border-l-4 transition-all ${config.color} hover:shadow-sm ${
                    categoriaSelecionada === cat.categoria ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${config.dot}`}></div>
                    <span className="text-sm font-medium text-gray-900">{cat.categoria}</span>
                  </div>
                  <div className="text-xs text-gray-600 ml-4">
                    {cat.lidas > 0 ? Math.round((cat.aprovadas / cat.lidas) * 100) : 0}% aprovação
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">
        {/* NÍVEL 1: Macro */}
        {!categoriaSelecionada && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 max-w-7xl"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Visão Geral</h2>
              <p className="text-gray-600">Acompanhamento microbiológico de todas as categorias</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Categorias</p>
                <p className="text-3xl font-bold text-gray-900">{categorias.length}</p>
              </div>
              <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-6">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Crítico</p>
                <p className="text-3xl font-bold text-red-600">
                  {categorias.filter(c => c.criticidade === Criticidade.CRÍTICO).length}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg shadow-sm border border-amber-200 p-6">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Atenção</p>
                <p className="text-3xl font-bold text-amber-600">
                  {categorias.filter(c => c.criticidade === Criticidade.ATENÇÃO).length}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-6">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Conforme</p>
                <p className="text-3xl font-bold text-green-600">
                  {categorias.filter(c => c.criticidade === Criticidade.CONFORME).length}
                </p>
              </div>
            </div>

            {/* Categorias Grid */}
            {categorias.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
                <Beaker className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-700 font-medium text-lg">Nenhuma categoria encontrada</p>
                <p className="text-sm text-gray-500 mt-2">Cadastre lançamentos para popular o dashboard</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {categoriasOrdenadas.map((cat) => {
                  const config = getCriticidadeConfig(cat.criticidade);
                  const taxaAprovacao = cat.lidas > 0 ? Math.round((cat.aprovadas / cat.lidas) * 100) : 0;
                  return (
                    <motion.div
                      key={cat.categoria}
                      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      onClick={() => {
                        carregarProdutos(cat.categoria);
                        setCategoriaSelecionada(cat.categoria);
                      }}
                      className={`bg-white rounded-lg shadow-sm border-l-4 p-6 cursor-pointer transition-all ${config.color}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{cat.categoria}</h3>
                          <p className="text-sm text-gray-600 mt-1">{cat.totalAnalises} análise(s)</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.text} bg-white border border-current/20`}>
                          {config.label}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      {cat.lidas > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">Taxa de aprovação</span>
                            <span className="text-sm font-bold text-gray-800">{taxaAprovacao}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${taxaAprovacao}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={`h-2 rounded-full ${
                                taxaAprovacao > 75 ? 'bg-green-500' : taxaAprovacao > 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Mini Stats */}
                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Aprovadas</p>
                          <p className="text-lg font-bold text-green-600">{cat.aprovadas}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Reprovadas</p>
                          <p className="text-lg font-bold text-red-600">{cat.reprovadas}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Aguardando</p>
                          <p className="text-lg font-bold text-amber-600">{cat.aguardandoLeitura}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* NÍVEL 2: Produtos */}
        {categoriaSelecionada && !produtoSelecionado && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 max-w-7xl"
          >
            <div className="mb-6 flex items-center gap-3">
              <motion.button
                whileHover={{ x: -4 }}
                onClick={() => setCategoriaSelecionada(null)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} />
                Voltar
              </motion.button>
              <span className="text-gray-400">/</span>
              <h2 className="text-2xl font-bold text-gray-900">{categoriaSelecionada}</h2>
            </div>

            {carregandoDetalhe ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                {produtos.map((prod) => {
                  const taxaAprovacao = prod.historico.length > 0
                    ? Math.round(
                        (prod.historico.filter(h => {
                          const val = h.value;
                          return val < 50;
                        }).length / prod.historico.length) * 100
                      )
                    : 0;
                  return (
                    <motion.div
                      key={prod.nome}
                      whileHover={{ y: -4 }}
                      onClick={() => {
                        setProdutoSelecionado(prod.nome);
                        carregarMicroorganismosProduto(categoriaSelecionada, prod.nome);
                      }}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-all"
                    >
                      <h3 className="text-lg font-bold text-gray-900 mb-4">{prod.nome}</h3>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-gray-600 font-medium mb-1">Taxa de Aprovação</p>
                          <p className="text-3xl font-bold text-blue-600">{Math.round((100 - prod.percentualReprovacao))}%</p>
                        </div>
                        <Home size={32} className="text-gray-300" />
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600">
                        {prod.historico.length} análise(s) registrada(s)
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* NÍVEL 3: Microrganismos */}
        {categoriaSelecionada && produtoSelecionado && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 max-w-7xl"
          >
            <div className="mb-6 flex items-center gap-3">
              <motion.button
                whileHover={{ x: -4 }}
                onClick={() => setProdutoSelecionado(null)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} />
                Voltar
              </motion.button>
              <span className="text-gray-400">/</span>
              <span className="text-sm text-gray-600">{categoriaSelecionada}</span>
              <span className="text-gray-400">/</span>
              <h2 className="text-2xl font-bold text-gray-900">{produtoSelecionado}</h2>
            </div>

            {carregandoDetalhe ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {microrganismos.map((micro) => (
                  <motion.div
                    key={micro.nome}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                  >
                    <ProgressMetricCard
                      title={micro.nome}
                      total={micro.mediaResultado?.toFixed(1)}
                      data={micro.historico}
                      size="md"
                      accent={
                        micro.percentualReprovacao > 50
                          ? 'rose'
                          : micro.percentualReprovacao > 25
                          ? 'amber'
                          : 'emerald'
                      }
                      loading={carregandoDetalhe}
                      valueFormatter={(v) => `${v.toFixed(1)}`}
                      dateFormatter={(d) => new Date(d).toLocaleDateString('pt-BR')}
                      unit=""
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>
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
