import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUsuario } from '../services/api';
import { podeGerenciar } from '../lib/perfis';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface LogAuditoria {
  _id: string;
  padraoId?: string;
  analiseId?: string;
  usuarioId: string;
  usuarioNome: string;
  timestamp: string;
  acao: 'criar' | 'editar' | 'deletar';
  dados: any;
  dadosAntigos?: any;
  /** Grafia legada do log de padrões, mantida para os registros já gravados. */
  dadosAnigos?: any;
  descricao?: string;
  // Identificação presente apenas nos logs de lançamentos
  produtoNome?: string;
  microrganismo?: string;
  lote?: string;
}

type Aba = 'lancamentos' | 'padroes';

export function AuditoriaPage() {
  const [aba, setAba] = useState<Aba>('lancamentos');
  const [logsLancamentos, setLogsLancamentos] = useState<LogAuditoria[]>([]);
  const [logsPadroes, setLogsPadroes] = useState<LogAuditoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAcao, setFiltroAcao] = useState<'' | 'criar' | 'editar' | 'deletar'>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!podeGerenciar(getUsuario()?.perfil)) {
      navigate('/dashboard');
      return;
    }
    carregarLogs();
  }, [navigate]);

  const carregarLogs = async () => {
    try {
      setCarregando(true);
      const [resAnalises, resPadroes] = await Promise.all([
        api.get<any>('/auditoria/analises'),
        api.get<any>('/auditoria/padroes'),
      ]);
      setLogsLancamentos(resAnalises.data.dados || []);
      setLogsPadroes(resPadroes.data.dados || []);
      setErro('');
    } catch (err: any) {
      setErro('Erro ao carregar logs de auditoria');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const formatarData = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
  };

  const getCorAcao = (acao: string) => {
    switch (acao) {
      case 'criar':
        return 'bg-green-100 text-green-800';
      case 'editar':
        return 'bg-blue-100 text-blue-800';
      case 'deletar':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTextAcao = (acao: string) => {
    switch (acao) {
      case 'criar':
        return '✨ Criado';
      case 'editar':
        return '✏️ Editado';
      case 'deletar':
        return '🗑️ Deletado';
      default:
        return acao;
    }
  };

  const logs = aba === 'lancamentos' ? logsLancamentos : logsPadroes;

  const logsFiltrados = logs.filter((log) => {
    const matchUsuario =
      !filtroUsuario || log.usuarioNome.toLowerCase().includes(filtroUsuario.toLowerCase());
    const matchAcao = !filtroAcao || log.acao === filtroAcao;
    return matchUsuario && matchAcao;
  });

  const usuariosUnicos = [...new Set(logs.map((log) => log.usuarioNome))].sort();

  const trocarAba = (nova: Aba) => {
    setAba(nova);
    setFiltroUsuario('');
    setFiltroAcao('');
    setExpandedId(null);
  };

  if (carregando) {
    return <div className="p-8 text-center">Carregando logs de auditoria...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Auditoria</h1>
        <p className="text-gray-600 mt-1">Histórico de mudanças em lançamentos e padrões de qualidade</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          { id: 'lancamentos' as Aba, label: 'Lançamentos', total: logsLancamentos.length },
          { id: 'padroes' as Aba, label: 'Padrões', total: logsPadroes.length },
        ]).map((item) => (
          <button
            key={item.id}
            onClick={() => trocarAba(item.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === item.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {item.label}
            <span className="ml-2 text-xs text-gray-400">{item.total}</span>
          </button>
        ))}
      </div>

      {erro && (
        <div className="mb-6 p-3 bg-red-50 border border-red-300 rounded-lg flex items-center space-x-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-sm text-red-800">{erro}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 bg-white rounded-lg p-4 shadow border">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filtrar por Usuário
            </label>
            <select
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os usuários</option>
              {usuariosUnicos.map((usuario) => (
                <option key={usuario} value={usuario}>
                  {usuario}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filtrar por Ação
            </label>
            <select
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas as ações</option>
              <option value="criar">✨ Criado</option>
              <option value="editar">✏️ Editado</option>
              <option value="deletar">🗑️ Deletado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="mb-6 text-sm text-gray-600">
        Mostrando {logsFiltrados.length} de {logs.length} registros
      </div>

      {/* Logs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {logsFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {logs.length === 0
              ? `Nenhuma alteração registrada em ${aba === 'lancamentos' ? 'lançamentos' : 'padrões'} ainda`
              : 'Nenhum log encontrado com os filtros aplicados'}
          </div>
        ) : (
          <div className="divide-y">
            {logsFiltrados.map((log) => {
              const anteriores = log.dadosAntigos || log.dadosAnigos;
              return (
                <div key={log._id} className="hover:bg-gray-50 transition-colors">
                  <div
                    className="p-4 cursor-pointer flex items-center justify-between"
                    onClick={() => setExpandedId(expandedId === log._id ? null : log._id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getCorAcao(log.acao)}`}
                        >
                          {getTextAcao(log.acao)}
                        </span>
                        <span className="font-medium text-gray-900">{log.usuarioNome}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-sm text-gray-600">{formatarData(log.timestamp)}</span>
                      </div>
                      {log.produtoNome && (
                        <p className="text-sm font-medium text-gray-800 mt-2">
                          {log.produtoNome} × {log.microrganismo}
                          {log.lote && <span className="text-gray-500"> · Lote {log.lote}</span>}
                        </p>
                      )}
                      {log.descricao && <p className="text-sm text-gray-700 mt-1">{log.descricao}</p>}
                    </div>
                    <div className="ml-4">
                      {expandedId === log._id ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Detalhes expandidos */}
                  {expandedId === log._id && (
                    <div className="px-4 pb-4 bg-gray-50 border-t">
                      <div className="grid grid-cols-2 gap-6 mt-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            {log.acao === 'deletar' ? 'Dados Deletados' : 'Dados Novos'}
                          </h4>
                          <ListaCampos dados={log.dados} />
                        </div>

                        {anteriores && Object.keys(anteriores).length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">
                              Dados Anteriores
                            </h4>
                            <ListaCampos dados={anteriores} />
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-gray-500">
                          {log.analiseId ? 'ID do Lançamento' : 'ID do Padrão'}:{' '}
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            {log.analiseId || log.padraoId}
                          </code>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ListaCampos({ dados }: { dados: any }) {
  if (!dados || typeof dados !== 'object') {
    return <div className="bg-white rounded p-3 text-xs text-gray-500">Sem detalhes</div>;
  }
  return (
    <div className="bg-white rounded p-3 space-y-1 text-xs">
      {Object.entries(dados).map(([key, value]: [string, any]) => (
        <div key={key} className="flex justify-between gap-3">
          <span className="font-medium text-gray-600">{key}:</span>
          <span className="text-gray-900 text-right break-all">
            {value === null || value === undefined
              ? '—'
              : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
