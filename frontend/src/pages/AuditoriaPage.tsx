import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUsuario } from '../services/api';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface LogAuditoria {
  _id: string;
  padraoId: string;
  usuarioId: string;
  usuarioNome: string;
  timestamp: string;
  acao: 'criar' | 'editar' | 'deletar';
  dados: any;
  dadosAntigos?: any;
  descricao?: string;
}

export function AuditoriaPage() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAcao, setFiltroAcao] = useState<'' | 'criar' | 'editar' | 'deletar'>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const usuario = getUsuario();
    const perfisAutorizados = ['Admin', 'Diretora', 'Supervisora Qualidade'];
    if (!usuario || !perfisAutorizados.includes(usuario.perfil)) {
      navigate('/dashboard');
      return;
    }
    carregarLogs();
  }, [navigate]);

  const carregarLogs = async () => {
    try {
      setCarregando(true);
      const response = await api.get<any>('/auditoria/padroes');
      setLogs(response.data.dados || []);
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

  // Filtrar logs
  const logsFiltrados = logs.filter(log => {
    const matchUsuario = !filtroUsuario || log.usuarioNome.toLowerCase().includes(filtroUsuario.toLowerCase());
    const matchAcao = !filtroAcao || log.acao === filtroAcao;
    return matchUsuario && matchAcao;
  });

  // Usuários únicos para dropdown
  const usuariosUnicos = [...new Set(logs.map(log => log.usuarioNome))].sort();

  if (carregando) {
    return <div className="p-8 text-center">Carregando logs de auditoria...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Auditoria de Padrões</h1>
        <p className="text-gray-600 mt-1">Histórico de todas as mudanças em Padrões de Qualidade</p>
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
            Nenhum log encontrado com os filtros aplicados
          </div>
        ) : (
          <div className="divide-y">
            {logsFiltrados.map((log) => (
              <div key={log._id} className="hover:bg-gray-50 transition-colors">
                <div
                  className="p-4 cursor-pointer flex items-center justify-between"
                  onClick={() => setExpandedId(expandedId === log._id ? null : log._id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getCorAcao(
                          log.acao
                        )}`}
                      >
                        {getTextAcao(log.acao)}
                      </span>
                      <span className="font-medium text-gray-900">{log.usuarioNome}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-sm text-gray-600">{formatarData(log.timestamp)}</span>
                    </div>
                    {log.descricao && (
                      <p className="text-sm text-gray-700 mt-2">{log.descricao}</p>
                    )}
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
                      {/* Dados Novos */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">
                          {log.acao === 'deletar' ? 'Dados Deletados' : 'Dados Novos'}
                        </h4>
                        <div className="bg-white rounded p-3 space-y-1 text-xs">
                          {Object.entries(log.dados).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between">
                              <span className="font-medium text-gray-600">{key}:</span>
                              <span className="text-gray-900">
                                {typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dados Antigos (apenas se houve edição) */}
                      {log.dadosAntigos && Object.keys(log.dadosAntigos).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Dados Anteriores
                          </h4>
                          <div className="bg-white rounded p-3 space-y-1 text-xs">
                            {Object.entries(log.dadosAntigos).map(([key, value]: [string, any]) => (
                              <div key={key} className="flex justify-between">
                                <span className="font-medium text-gray-600">{key}:</span>
                                <span className="text-gray-900">
                                  {typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ID do Padrão */}
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500">
                        ID do Padrão: <code className="bg-gray-100 px-2 py-1 rounded">{log.padraoId}</code>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
