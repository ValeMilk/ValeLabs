import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, ListChecks } from 'lucide-react';
import { api } from '../services/api';
import type { DashboardHeatmap } from '../types/shared-types';
import { diasAguardando, faixaReprovacao } from '../lib/dashboard';

export function DashboardPage() {
  const [dados, setDados] = useState<DashboardHeatmap | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      setCarregando(true);
      setErro('');
      const response = await api.get('/dashboard/heatmap');
      setDados(response.data.dados);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao carregar dashboard');
    } finally {
      setCarregando(false);
    }
  };

  const irParaDetalhe = (produto: string, microrganismo: string) => {
    navigate(`/dashboard/detalhe?produto=${encodeURIComponent(produto)}&micro=${encodeURIComponent(microrganismo)}`);
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
        <p className="text-gray-700 font-medium">{erro || 'Não foi possível carregar o dashboard'}</p>
      </div>
    );
  }

  const { kpis, produtos, microrganismos, celulas, topPares, backlog } = dados;

  const celula = (produto: string, microrganismo: string) =>
    celulas.find((c) => c.produto === produto && c.microrganismo === microrganismo) || null;

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Acompanhamento Microbiológico</h1>
      <p className="text-gray-600 mb-8">Visão geral de produtos × microrganismos</p>

      {/* Seção 1 — KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Total de análises</p>
          <p className="text-3xl font-bold text-blue-600">{kpis.total}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-6">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">Aprovadas</p>
          <p className="text-3xl font-bold text-green-700">{kpis.aprovadas}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-6">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Reprovadas</p>
          <p className="text-3xl font-bold text-red-700">{kpis.reprovadas}</p>
        </div>
      </div>

      {/* Seção 2 — Mapa de calor */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
          Mapa de calor · Produto × Microrganismo
        </h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {produtos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma análise registrada ainda.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-auto border-separate border-spacing-1">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 py-2 sticky left-0 bg-white z-10">
                        Produto
                      </th>
                      {microrganismos.map((m) => (
                        <th
                          key={m}
                          className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider px-2 py-2 whitespace-nowrap min-w-[5rem]"
                        >
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.map((p) => (
                      <tr key={p}>
                        <td className="text-sm font-medium text-gray-900 px-3 py-2 whitespace-nowrap sticky left-0 bg-white z-10">
                          {p}
                        </td>
                        {microrganismos.map((m) => {
                          const c = celula(p, m);
                          const faixa = faixaReprovacao(c?.percentual ?? null);
                          const clicavel = !!c && c.percentual !== null && c.percentual > 0;
                          return (
                            <td key={m} className="p-0 text-center align-middle min-w-[5rem]">
                              <button
                                type="button"
                                disabled={!clicavel}
                                onClick={() => clicavel && irParaDetalhe(p, m)}
                                title={
                                  c && c.percentual !== null
                                    ? `${c.reprovadas}/${c.avaliadas} reprovadas`
                                    : 'Sem análises lidas'
                                }
                                className={`block w-full h-14 rounded-md text-sm font-bold transition-transform ${
                                  clicavel ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                                }`}
                                style={{ backgroundColor: faixa.bg, color: faixa.text }}
                              >
                                {c && c.percentual !== null ? `${Math.round(c.percentual)}%` : '—'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-gray-200">
                {[
                  { p: null, label: 'Sem análises' },
                  { p: 0, label: '0%' },
                  { p: 10, label: '1–25%' },
                  { p: 50, label: '26–74%' },
                  { p: 90, label: '≥75%' },
                ].map((item) => {
                  const faixa = faixaReprovacao(item.p);
                  return (
                    <div key={item.label} className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: faixa.bg, border: '1px solid rgba(0,0,0,0.08)' }}
                      />
                      <span className="text-xs text-gray-600">{item.label} de reprovação</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Seção 3 — Focos e backlog */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Ranking */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Pares com maior reprovação
          </h2>
          {topPares.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">Nenhum par com análises lidas ainda.</p>
          ) : (
            <div className="space-y-3">
              {topPares.map((par, idx) => {
                const faixa = faixaReprovacao(par.percentual);
                return (
                  <motion.div
                    key={`${par.produto}-${par.microrganismo}`}
                    whileHover={{ x: 4 }}
                    onClick={() => irParaDetalhe(par.produto, par.microrganismo)}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="w-6 text-center text-sm font-bold text-gray-400">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {par.produto} × {par.microrganismo}
                        </p>
                        <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                          {Math.round(par.percentual || 0)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{par.categoria}</p>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${par.percentual}%`, backgroundColor: faixa.bar }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Backlog */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            Backlog de leituras
          </h2>
          {backlog.length === 0 ? (
            <div className="flex items-center gap-2 text-green-700 text-sm py-4">
              <CheckCircle size={16} />
              Nenhuma leitura pendente
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {backlog.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.produto}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.microrganismo}
                      {item.lote && <span className="text-gray-400"> · Lote {item.lote}</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        item.badge === 'atrasada'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.badge === 'atrasada' ? 'Atrasada' : item.badge === 'vence_hoje' ? 'Vence hoje' : 'Aguardando'}
                    </span>
                    <span className="text-xs text-gray-500">{diasAguardando(item.dataInoculacao)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {celulas.length === 0 && (
        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <ListChecks size={14} />
          Nenhum dado disponível ainda.
        </div>
      )}
    </div>
  );
}
