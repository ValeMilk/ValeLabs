import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import type { DashboardProdutoResumo } from '../types/shared-types';
import { formatarData } from '../types/shared-types';
import { EvolucaoMultiChart } from '../components/EvolucaoMultiChart';
import { ConformidadePill } from '../components/ConformidadePill';

export function ProdutoResumoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const produto = searchParams.get('produto') || '';

  const [dados, setDados] = useState<DashboardProdutoResumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtroMicro, setFiltroMicro] = useState('');
  const [filtroLote, setFiltroLote] = useState('');

  useEffect(() => {
    if (!produto) {
      navigate('/dashboard');
      return;
    }
    carregar();
  }, [produto]);

  const carregar = async () => {
    try {
      setCarregando(true);
      setErro('');
      const response = await api.get('/dashboard/produto', { params: { produto } });
      setDados(response.data.dados);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao carregar resumo do produto');
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
        <p className="text-gray-700 font-medium">{erro || 'Produto não encontrado'}</p>
      </div>
    );
  }

  const { categoria, microrganismos, kpis, historico, tabela } = dados;

  // Lotes presentes, para o filtro do resumo.
  const lotes = Array.from(new Set(tabela.map((l) => l.lote).filter(Boolean))).sort();

  const casaComFiltro = (linha: { microrganismo: string; lote: string }) =>
    (!filtroMicro || linha.microrganismo === filtroMicro) && (!filtroLote || linha.lote === filtroLote);

  const historicoFiltrado = historico.filter(casaComFiltro);
  const tabelaFiltrada = tabela.filter(casaComFiltro);

  // KPIs recalculados sobre o filtro ativo — sem filtro, batem com os totais do produto.
  const filtroAtivo = !!filtroMicro || !!filtroLote;
  const aprovadas = filtroAtivo
    ? tabelaFiltrada.filter((l) => l.statusConformidade === 'APROVADO').length
    : kpis.aprovadas;
  const reprovadas = filtroAtivo
    ? tabelaFiltrada.filter((l) => l.statusConformidade === 'REPROVADO').length
    : kpis.reprovadas;
  const total = filtroAtivo ? tabelaFiltrada.length : kpis.total;
  const avaliadas = aprovadas + reprovadas;
  const taxaReprovacao = avaliadas > 0 ? ((reprovadas / avaliadas) * 100).toFixed(1) : '0.0';

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

      <h1 className="text-3xl font-bold text-gray-900">{produto}</h1>
      <p className="text-gray-600 mb-8">
        {categoria} · {microrganismos.length} microrganismo{microrganismos.length === 1 ? '' : 's'} analisado
        {microrganismos.length === 1 ? '' : 's'}
      </p>

      {/* Filtros de lote e microrganismo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
            Microrganismo
          </label>
          <select
            value={filtroMicro}
            onChange={(e) => setFiltroMicro(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {microrganismos.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
            Lote
          </label>
          <select
            value={filtroLote}
            onChange={(e) => setFiltroLote(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {lotes.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {filtroAtivo && (
          <button
            type="button"
            onClick={() => {
              setFiltroMicro('');
              setFiltroLote('');
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* KPIs do produto */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Total analisadas</p>
          <p className="text-2xl font-bold text-blue-600">{total}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Aprovadas</p>
          <p className="text-2xl font-bold text-green-700">{aprovadas}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Reprovadas</p>
          <p className="text-2xl font-bold text-red-700">{reprovadas}</p>
        </div>
        <div className="bg-orange-50 rounded-lg shadow-sm border border-orange-200 p-4">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1">
            Taxa de reprovação
          </p>
          <p className="text-2xl font-bold text-orange-700">{taxaReprovacao}%</p>
        </div>
      </div>

      {/* Gráfico de evolução — sem linhas de padrão, pois cada microrganismo tem limites próprios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-1">
          Evolução dos resultados
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Uma linha por microrganismo · os limites de padrão variam por microrganismo e não são exibidos
        </p>
        <EvolucaoMultiChart historico={historicoFiltrado} microrganismos={microrganismos} />
      </div>

      {/* Tabela histórica */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider px-6 pt-6 mb-4">
          Histórico de análises
        </h2>
        {tabelaFiltrada.length === 0 ? (
          <p className="text-gray-500 text-sm px-6 pb-6">Nenhuma análise para os filtros aplicados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Lote</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Microrganismo</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Data inoculação</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Data leitura</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Ponto de coleta</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Resultado</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Conformidade</th>
                  <th className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider px-6 py-3">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tabelaFiltrada.map((linha, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{linha.lote || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{linha.microrganismo}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{formatarData(linha.dataInoculacao)}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {linha.dataLeitura ? formatarData(linha.dataLeitura) : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{linha.pontoColeta || '-'}</td>
                    <td className="px-6 py-3 text-sm">
                      {linha.resultado !== null ? (
                        <span className="text-gray-900 font-medium">
                          {linha.resultado} {linha.unidade}
                        </span>
                      ) : (
                        <span className="text-gray-400">Aguardando</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <ConformidadePill status={linha.statusConformidade} />
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700 max-w-xs">
                      <span className="line-clamp-2" title={linha.observacoes || ''}>
                        {linha.observacoes || '—'}
                      </span>
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
