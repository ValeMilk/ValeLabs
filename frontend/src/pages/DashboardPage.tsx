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
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface SeriesPoint {
  value: number;
  date: string;
}

interface ProdutoData {
  nome: string;
  produtoId?: string;
  percentualReprovacao: number;
  historico: SeriesPoint[];
  microrganismos: MicroorganismoData[];
  analises?: any[]; // Armazena análises individuais
}

interface MicroorganismoData {
  nome: string;
  percentualReprovacao: number;
  historico: SeriesPoint[];
  mediaResultado?: number; // Média dos resultados para exibição
}

interface TabelaRow {
  produto: string;
  microrganismo: string;
  avaliadas: number;
  aprovadas: number;
  reprovadas: number;
  percentualReprovacao: number;
  prioridade: 'ALTA' | 'MÉDIA' | 'BAIXA';
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
  
  // Tabela ordenável
  const [tabelaDados, setTabelaDados] = useState<TabelaRow[]>([]);
  const [sortColumn, setSortColumn] = useState<keyof TabelaRow>('produto');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Indicadores da tela principal
  const [indicadores, setIndicadores] = useState({
    total: 0,
    aprovados: 0,
    atencao: 0,
    reprovados: 0
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    carregarCategorias();
    carregarTabelaDados();
  }, []);

  // Carregar dados para a tabela inicial
  const carregarTabelaDados = async () => {
    try {
      const response = await api.get('/analises');
      const analises = response.data.dados || [];
      
      // Agrupar por produto + microrganismo
      const agrupadoTabela: Record<string, TabelaRow> = {};
      
      analises.forEach((analise: any) => {
        const produto = analise.produtoNome || 'Sem produto';
        const micro = analise.microrganismo || 'Desconhecido';
        const chave = `${produto}|${micro}`;
        
        if (!agrupadoTabela[chave]) {
          agrupadoTabela[chave] = {
            produto,
            microrganismo: micro,
            avaliadas: 0,
            aprovadas: 0,
            reprovadas: 0,
            percentualReprovacao: 0,
            prioridade: 'BAIXA'
          };
        }
        
        agrupadoTabela[chave].avaliadas += 1;
        if (analise.statusConformidade === 'APROVADO') {
          agrupadoTabela[chave].aprovadas += 1;
        } else if (analise.statusConformidade === 'REPROVADO') {
          agrupadoTabela[chave].reprovadas += 1;
        }
      });
      
      // Calcular percentual e prioridade
      const tabelaDadosCalculado = Object.values(agrupadoTabela).map(row => {
        const percentual = row.avaliadas > 0 ? (row.reprovadas / row.avaliadas) * 100 : 0;
        let prioridade: 'ALTA' | 'MÉDIA' | 'BAIXA' = 'BAIXA';
        if (percentual > 50) prioridade = 'ALTA';
        else if (percentual > 25) prioridade = 'MÉDIA';
        
        return {
          ...row,
          percentualReprovacao: percentual,
          prioridade
        };
      });
      
      // Calcular indicadores
      const totalAnalises = analises.length;
      const aprovadosCount = analises.filter((a: any) => a.statusConformidade === 'APROVADO').length;
      const reprovadosCount = analises.filter((a: any) => a.statusConformidade === 'REPROVADO').length;
      const atencaoCount = tabelaDadosCalculado.filter(row => row.prioridade === 'MÉDIA').length;
      
      setTabelaDados(tabelaDadosCalculado);
      setIndicadores({
        total: totalAnalises,
        aprovados: aprovadosCount,
        atencao: atencaoCount,
        reprovados: reprovadosCount
      });
    } catch (err: any) {
      console.error('Erro ao carregar dados da tabela:', err);
    }
  };

  useEffect(() => {
    console.log('🔄 Estado renderizado:', { 
      categoriaSelecionada, 
      produtoSelecionado, 
      carregandoDetalhe,
      microorganismosLength: microrganismos.length 
    });
  }, [categoriaSelecionada, produtoSelecionado, carregandoDetalhe, microrganismos]);

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
      console.log('📊 Análises recebidas para produtos:', { categoria, total: analises.length, amostra: analises.slice(0, 3) });
      
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
        // Armazenar análises individuais deste produto
        const analysesDosProduto = analises.filter((a: any) => (a.produtoNome || 'Sem produto') === produtoNome);
        
        const aprovados = analysesDosProduto.filter((a: any) => a.statusConformidade === 'APROVADO').length;
        const reprovados = analysesDosProduto.filter((a: any) => a.statusConformidade === 'REPROVADO').length;
        const pendentes = analysesDosProduto.filter((a: any) => a.statusConformidade === 'PENDENTE').length;
        
        console.log(`📦 Produto ${produtoNome}:`, { 
          total: analysesDosProduto.length, 
          aprovados, 
          reprovados, 
          pendentes,
          statuses: analysesDosProduto.map((a: any) => a.statusConformidade)
        });
        
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
        agrupadoProduto[produtoNome].analises = analysesDosProduto;
        // Calcular percentual usando análises individuais, não datas agregadas
        agrupadoProduto[produtoNome].percentualReprovacao = analysesDosProduto.length > 0
          ? (reprovados / analysesDosProduto.length) * 100
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
      console.log('🔄 Iniciando carregarMicroorganismosProduto:', { categoria, produtoNome });
      setCarregandoDetalhe(true);
      setProdutoSelecionado(produtoNome);
      console.log('✅ setProdutoSelecionado chamado com:', produtoNome);
      
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
      console.log('✅ Microrganismos carregados:', Object.values(agrupadoMicro).length);
    } catch (err: any) {
      console.error('❌ Erro ao carregar microrganismos:', err?.message, err);
      setErro(err.response?.data?.mensagem || 'Erro ao carregar microrganismos');
    } finally {
      console.log('🏁 Finalizando carregarMicroorganismosProduto, setCarregandoDetalhe = false');
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

  // Ordenar dados da tabela
  const tabelaDadosOrdenados = [...tabelaDados].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    
    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    }
    
    if (typeof aVal === 'number') {
      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    }
    
    return 0;
  });

  const handleSort = (column: keyof TabelaRow) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getPrioridadeStyle = (prioridade: string) => {
    switch (prioridade) {
      case 'ALTA':
        return 'bg-red-50 border-l-red-500';
      case 'MÉDIA':
        return 'bg-amber-50 border-l-amber-500';
      default:
        return 'bg-green-50 border-l-green-500';
    }
  };

  const TableHeader = ({ column, label }: { column: keyof TabelaRow; label: string }) => (
    <th 
      onClick={() => handleSort(column)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        {label}
        {sortColumn === column && (
          sortDirection === 'asc' 
            ? <ChevronUp size={16} className="text-blue-600" />
            : <ChevronDown size={16} className="text-blue-600" />
        )}
      </div>
    </th>
  );



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

  // Debug: log antes de renderizar
  if (categoriaSelecionada && produtoSelecionado) {
    console.log('🎯 Renderizando Nível 3 agora!', { categoriaSelecionada, produtoSelecionado, microrganismos });
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            {categoriaSelecionada && (
              <motion.button
                whileHover={{ x: -4 }}
                onClick={() => {
                  if (produtoSelecionado) {
                    setProdutoSelecionado(null);
                  } else {
                    setCategoriaSelecionada(null);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} />
                Voltar
              </motion.button>
            )}
          </div>

          {!categoriaSelecionada && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Acompanhamento Microbiológico</h1>
              <p className="text-gray-600">Categorias · Produtos · Microrganismos</p>
            </>
          )}
          {categoriaSelecionada && !produtoSelecionado && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{categoriaSelecionada}</h1>
              <p className="text-gray-600">Produtos desta categoria</p>
            </>
          )}
          {categoriaSelecionada && produtoSelecionado && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{produtoSelecionado}</h1>
              <p className="text-gray-600">{categoriaSelecionada} · Microrganismos</p>
            </>
          )}
        </div>
      </div>

      {/* NÍVEL 1: Categorias */}
      {!categoriaSelecionada && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto px-8 py-12"
        >
          <div className="grid grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Total</p>
              <p className="text-3xl font-bold text-blue-600">{indicadores.total}</p>
              <p className="text-xs text-gray-600 mt-2">análises</p>
            </div>
            <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-6">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Aprovados</p>
              <p className="text-3xl font-bold text-green-600">
                {indicadores.aprovados}
              </p>
            </div>
            <div className="bg-amber-50 rounded-lg shadow-sm border border-amber-200 p-6">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Atenção</p>
              <p className="text-3xl font-bold text-amber-600">
                {indicadores.atencao}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-6">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Reprovados</p>
              <p className="text-3xl font-bold text-red-600">
                {indicadores.reprovados}
              </p>
            </div>
          </div>

          {/* TABELA ORDENÁVEL - Produtos × Microrganismos */}
          {tabelaDados.length > 0 && (
            <div className="mb-12">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
                Acompanhamento de Produtos e Microrganismos
              </h2>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <TableHeader column="produto" label="Produto" />
                        <TableHeader column="microrganismo" label="Microrganismo" />
                        <TableHeader column="avaliadas" label="Avaliadas" />
                        <TableHeader column="aprovadas" label="Aprovadas" />
                        <TableHeader column="reprovadas" label="Reprovadas" />
                        <TableHeader column="percentualReprovacao" label="% Reprovação" />
                        <TableHeader column="prioridade" label="Prioridade" />
                      </tr>
                    </thead>
                    <tbody>
                      {tabelaDadosOrdenados.map((row, idx) => (
                        <tr 
                          key={`${row.produto}-${row.microrganismo}`}
                          className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors border-l-4 ${getPrioridadeStyle(row.prioridade)}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.produto}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {row.microrganismo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                            {row.avaliadas}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-center">
                            {row.aprovadas}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 text-center">
                            {row.reprovadas}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              row.prioridade === 'ALTA' ? 'bg-red-100 text-red-700' :
                              row.prioridade === 'MÉDIA' ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {row.percentualReprovacao.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              row.prioridade === 'ALTA' ? 'bg-red-100 text-red-700' :
                              row.prioridade === 'MÉDIA' ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {row.prioridade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {categorias.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
              <Beaker className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-700 font-medium text-lg">Nenhuma categoria encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Categorias</h2>
              <div className="grid grid-cols-4 gap-4">
                {categoriasOrdenadas.map((cat) => {
                  const config = getCriticidadeConfig(cat.criticidade);
                  const taxaAprovacao = cat.lidas > 0 ? Math.round((cat.aprovadas / cat.lidas) * 100) : 0;
                  const piorAnalise = cat.totalAnalises > 0 
                    ? `${cat.reprovadas} reprovada(s)` 
                    : 'sem dados';

                  return (
                    <motion.div
                      key={cat.categoria}
                      whileHover={{ y: -6, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      onClick={() => {
                        carregarProdutos(cat.categoria);
                        setCategoriaSelecionada(cat.categoria);
                      }}
                      className={`bg-white rounded-lg shadow-sm border-l-4 p-5 cursor-pointer transition-all ${config.color}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{cat.categoria}</h3>
                          <p className="text-xs text-gray-600 mt-1">{cat.totalAnalises} análise(s)</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${config.text}`}>
                          {config.label}
                        </span>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs text-gray-600 font-medium mb-1">Pior: <span className="text-gray-900">{piorAnalise}</span></p>
                      </div>

                      {cat.lidas > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-600">Taxa aprovação</span>
                            <span className="text-xs font-bold text-gray-800">{taxaAprovacao}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${taxaAprovacao}%` }}
                              transition={{ duration: 0.8 }}
                              className={`h-1.5 rounded-full ${
                                taxaAprovacao > 75 ? 'bg-green-500' : taxaAprovacao > 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-xs text-gray-600">Aprovadas</p>
                          <p className="font-bold text-green-600">{cat.aprovadas}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Reprovadas</p>
                          <p className="font-bold text-red-600">{cat.reprovadas}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Aguardando</p>
                          <p className="font-bold text-amber-600">{cat.aguardandoLeitura}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* NÍVEL 2: Produtos */}
      {categoriaSelecionada && !produtoSelecionado && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto px-8 py-12"
        >
          {carregandoDetalhe ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-6">
              {produtos.map((prod) => {
                // Contar análises individuais, não datas agregadas
                const aprovados = (prod.analises || []).filter((a: any) => a.statusConformidade === 'APROVADO').length;
                const reprovados = (prod.analises || []).filter((a: any) => a.statusConformidade === 'REPROVADO').length;
                const total = prod.analises?.length || 0;
                const percentualReprovacao = prod.percentualReprovacao;
                
                let criticidade: 'alta' | 'media' | 'ok' = 'ok';
                if (percentualReprovacao > 50) criticidade = 'alta';
                else if (percentualReprovacao > 25) criticidade = 'media';
                
                const borderColor = criticidade === 'alta' ? 'border-l-red-500' : criticidade === 'media' ? 'border-l-amber-500' : 'border-l-green-500';

                return (
                  <motion.div
                    key={prod.nome}
                    whileHover={{ y: -6, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}
                    onClick={() => {
                      setProdutoSelecionado(prod.nome);
                      carregarMicroorganismosProduto(categoriaSelecionada, prod.nome);
                    }}
                    className={`bg-white rounded-lg shadow-sm border-l-4 ${borderColor} p-5 cursor-pointer transition-all`}
                  >
                    <div className="mb-4">
                      <h3 className="font-bold text-gray-900 mb-1">{prod.nome}</h3>
                      <p className="text-xs text-gray-600">{prod.microrganismos.length} microrganismo(s)</p>
                    </div>

                    {/* Mini gráfico de barras - Coluna proporcional de baixo pra cima */}
                    <div className="flex items-end justify-center gap-3 h-24 mb-3">
                      <div 
                        className="flex-1 bg-green-500 rounded-t-md transition-all"
                        style={{ height: `${total > 0 ? (aprovados / total) * 100 : 0}%`, minHeight: '4px' }}
                      ></div>
                      <div 
                        className="flex-1 bg-red-500 rounded-t-md transition-all"
                        style={{ height: `${total > 0 ? (reprovados / total) * 100 : 0}%`, minHeight: '4px' }}
                      ></div>
                    </div>
                    
                    {/* Labels das barras - Aprovadas e Reprovadas */}
                    <div className="flex justify-center gap-3 mb-3">
                      <div className="flex-1 text-center">
                        <p className="text-xs font-bold text-green-600">{aprovados}</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-xs font-bold text-red-600">{reprovados}</p>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 border-t pt-2">
                      <div className="flex justify-between">
                        <span>Taxa reprovação:</span>
                        <span className="font-bold text-gray-900">{percentualReprovacao.toFixed(1)}%</span>
                      </div>
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto px-8 py-12"
        >
          {carregandoDetalhe ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8">
              {microrganismos.map((micro) => {
                const stats = micro.historico.length > 0
                  ? {
                      max: Math.max(...micro.historico.map(h => h.value)),
                      min: Math.min(...micro.historico.map(h => h.value)),
                      avg: micro.historico.reduce((sum, h) => sum + h.value, 0) / micro.historico.length,
                      latest: micro.historico[micro.historico.length - 1]?.value || 0,
                      previous: micro.historico.length > 1 ? micro.historico[micro.historico.length - 2]?.value || 0 : 0
                    }
                  : { max: 0, min: 0, avg: 0, latest: 0, previous: 0 };

                const trend = stats.latest - stats.previous;
                
                // Dados para o gráfico
                const chartData = micro.historico.map(p => ({
                  value: p.value,
                  date: new Date(p.date).toLocaleDateString('pt-BR')
                }));

                // Determinar cor do background
                let bgColor = 'from-emerald-50 to-emerald-100';
                let strokeColor = '#10b981';
                if (micro.percentualReprovacao > 50) {
                  bgColor = 'from-orange-50 to-orange-100';
                  strokeColor = '#f97316';
                } else if (micro.percentualReprovacao > 25) {
                  bgColor = 'from-amber-50 to-amber-100';
                  strokeColor = '#f59e0b';
                }

                return (
                  <motion.div
                    key={micro.nome}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`bg-gradient-to-br ${bgColor} rounded-2xl p-8 shadow-sm border border-gray-200 overflow-hidden`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{micro.nome}</h3>
                        <p className="text-sm text-gray-600 mt-1">{micro.historico.length} análise(s)</p>
                      </div>
                    </div>

                    {/* Valor principal + Gráfico */}
                    <div className="flex items-end gap-6 mb-6">
                      {/* Valor */}
                      <div className="flex-shrink-0">
                        <p className="text-6xl font-bold text-gray-900 leading-none">{stats.latest.toFixed(1)}</p>
                        <p className={`text-sm font-semibold mt-2 ${trend >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)} hoje
                        </p>
                      </div>

                      {/* Gráfico */}
                      <div className="flex-1 h-24">
                        {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
                              <XAxis dataKey="date" tick={false} />
                              <YAxis tick={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                formatter={(value: any) => typeof value === 'number' ? value.toFixed(1) : value}
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke={strokeColor}
                                strokeWidth={2.5}
                                dot={{ fill: strokeColor, r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">Sem dados</div>
                        )}
                      </div>
                    </div>

                    {/* Stats rodapé */}
                    <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-300/50 gap-4">
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-600 font-medium">Hoje</p>
                        <p className={`font-bold text-base ${trend >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-gray-300/50"></div>
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-600 font-medium">Máx</p>
                        <p className="font-bold text-base text-gray-900">{stats.max.toFixed(1)}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-300/50"></div>
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-600 font-medium">Mín</p>
                        <p className="font-bold text-base text-gray-900">{stats.min.toFixed(1)}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-300/50"></div>
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-600 font-medium">Média</p>
                        <p className="font-bold text-base text-gray-900">{stats.avg.toFixed(1)}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
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
