import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Analise, Produto } from '../types/shared-types';
import { Plus, X, Check, Trash2, Edit2 } from 'lucide-react';

interface Padrao {
  _id: string;
  categoria: string;
  microrganismo: string;
  limiteMinimo: number;
  limiteMaximo: number;
  unidade: string;
}

interface NovaAnaliseInline {
  lote: string;
  categoria: string;
  produto: string;
  microrganismo: string;
  ponto: string;
  padraominimo: number | '';
  padraomaximo: number | '';
  resultado: string;
  status: 'APROVADO' | 'REPROVADO' | '';
}

const NOVA_ANALISE_VAZIA: NovaAnaliseInline = {
  lote: '',
  categoria: '',
  produto: '',
  microrganismo: '',
  ponto: '',
  padraominimo: '',
  padraomaximo: '',
  resultado: '',
  status: '',
};

interface EdicaoInline {
  lote: string;
  ponto: string;
  resultado: string;
}

export function LancamentosPage() {
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [padroes, setPadroes] = useState<Padrao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [mostraNovaLinha, setMostraNovaLinha] = useState(false);

  const [novaAnalise, setNovaAnalise] = useState<NovaAnaliseInline>(NOVA_ANALISE_VAZIA);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<EdicaoInline>({ lote: '', ponto: '', resultado: '' });

  const pontosColeta = ['Único', 'Início', 'Meio', 'Fim', 'Base'];

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [resAnalises, resProdutos, resPadroes] = await Promise.all([
        api.get('/analises?limite=50'),
        api.get('/produtos'),
        api.get('/padroes'),
      ]);
      
      console.log('Dados Padrões recebidos:', resPadroes.data);
      console.log('Dados Produtos recebidos:', resProdutos.data);
      
      setAnalises(resAnalises.data.dados || []);
      setProdutos(resProdutos.data.dados || []);
      setPadroes(resPadroes.data.dados || []);
      setErro('');
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err.message, err.response?.data);
      setErro(err.response?.data?.mensagem || 'Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  // Obter categorias únicas dos padrões
  const categorias = Array.from(
    new Set(padroes.map((p) => p.categoria))
  ).sort();

  // Filtrar produtos por categoria selecionada
  const produtosFiltrados = novaAnalise.categoria
    ? produtos.filter((p) => p.categoria === novaAnalise.categoria)
    : [];

  // Filtrar microrganismos por categoria selecionada
  const microrganismosFiltrados = novaAnalise.categoria
    ? Array.from(
        new Set(
          padroes
            .filter((p) => p.categoria === novaAnalise.categoria)
            .map((p) => p.microrganismo)
        )
      ).sort()
    : [];

  // Encontrar padrão quando categoria e microrganismo são selecionados
  const buscarPadrao = (categoria: string, microrganismo: string) => {
    const padrao = padroes.find(
      (p) => p.categoria === categoria && p.microrganismo === microrganismo
    );
    if (padrao) {
      setNovaAnalise((prev) => ({
        ...prev,
        padraominimo: padrao.limiteMinimo,
        padraomaximo: padrao.limiteMaximo,
      }));
    } else {
      setNovaAnalise((prev) => ({
        ...prev,
        padraominimo: '',
        padraomaximo: '',
      }));
    }
  };

  // Função para obter nome do produto pelo ID
  const getNomeProduto = (produtoId: string): string => {
    const produto = produtos.find((p) => p._id === produtoId);
    return produto?.nome || produtoId;
  };

  // Calcular status automaticamente
  const calcularStatus = (resultado: string, min: number | '', max: number | ''): 'APROVADO' | 'REPROVADO' | '' => {
    if (!resultado || min === '' || max === '') return '';

    const res = parseFloat(resultado);
    if (isNaN(res)) return '';

    if (res >= (min as number) && res <= (max as number)) {
      return 'APROVADO';
    } else {
      return 'REPROVADO';
    }
  };

  const handleCategoriaChange = (categoria: string) => {
    setNovaAnalise({
      ...novaAnalise,
      categoria,
      produto: '',
      microrganismo: '',
      padraominimo: '',
      padraomaximo: '',
      resultado: '',
      status: '',
    });
  };

  const handleProdutoChange = (produto: string) => {
    setNovaAnalise((prev) => ({
      ...prev,
      produto,
    }));
  };

  const handleMicrorganismoChange = (microrganismo: string) => {
    buscarPadrao(novaAnalise.categoria, microrganismo);
    setNovaAnalise((prev) => ({
      ...prev,
      microrganismo,
      resultado: '',
      status: '',
    }));
  };

  const handlePontoChange = (ponto: string) => {
    setNovaAnalise((prev) => ({
      ...prev,
      ponto,
    }));
  };

  const handleResultadoChange = (resultado: string) => {
    const novoStatus = calcularStatus(
      resultado,
      novaAnalise.padraominimo,
      novaAnalise.padraomaximo
    );
    setNovaAnalise((prev) => ({
      ...prev,
      resultado,
      status: novoStatus,
    }));
  };

  const salvarNovaAnalise = async () => {
    // Lote e resultado são opcionais — sem resultado a análise fica PENDENTE.
    if (
      !novaAnalise.categoria ||
      !novaAnalise.produto ||
      !novaAnalise.microrganismo ||
      !novaAnalise.ponto
    ) {
      setErro('Preencha categoria, produto, microrganismo e ponto de coleta');
      return;
    }

    const payload = {
      lote: novaAnalise.lote.trim(),
      produto: novaAnalise.produto,
      categoria: novaAnalise.categoria,
      microrganismo: novaAnalise.microrganismo,
      pontoColeta: novaAnalise.ponto,
      resultado: novaAnalise.resultado ? parseFloat(novaAnalise.resultado) : null,
      dataInoculacao: new Date().toISOString(),
      dataPrevistaLeitura: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
      await api.post('/analises', payload);
      setMensagem('Análise lançada com sucesso!');
      setNovaAnalise(NOVA_ANALISE_VAZIA);
      setMostraNovaLinha(false);
      setErro('');
      await carregarDados();
      setTimeout(() => setMensagem(''), 3000);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao lançar análise');
    }
  };

  const iniciarEdicao = (analise: Analise) => {
    setEditandoId(analise._id || null);
    setEdicao({
      lote: analise.lote || '',
      ponto: analise.pontoColeta || '',
      resultado: analise.resultado !== null && analise.resultado !== undefined ? String(analise.resultado) : '',
    });
    setErro('');
  };

  const salvarEdicao = async () => {
    if (!editandoId) return;
    try {
      await api.patch(`/analises/${editandoId}`, {
        lote: edicao.lote.trim(),
        pontoColeta: edicao.ponto,
        resultado: edicao.resultado.trim() === '' ? null : edicao.resultado.trim(),
      });
      setEditandoId(null);
      setMensagem('Análise atualizada com sucesso!');
      setErro('');
      await carregarDados();
      setTimeout(() => setMensagem(''), 3000);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || err.response?.data?.erro || 'Erro ao atualizar análise');
    }
  };

  const cancelarNovaAnalise = () => {
    setNovaAnalise(NOVA_ANALISE_VAZIA);
    setMostraNovaLinha(false);
    setErro('');
  };

  // Padrão vigente da linha, para preencher as colunas Mín./Máx. do histórico.
  const padraoDe = (categoria: string, microrganismo: string) =>
    padroes.find((p) => p.categoria === categoria && p.microrganismo === microrganismo);

  const handleDeletarAnalise = (id: string | undefined) => {
    if (!id) return;
    if (!confirm('Tem certeza que deseja deletar esta análise?')) return;
    
    api.delete(`/analises/${id}`)
      .then(() => {
        setMensagem('Análise deletada com sucesso!');
        carregarDados();
        setTimeout(() => setMensagem(''), 3000);
      })
      .catch((err) => {
        setErro(err.response?.data?.mensagem || 'Erro ao deletar análise');
      });
  };

  if (carregando) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lançamentos</h1>
          <p className="text-gray-600">Registre novas análises de laboratório</p>
        </div>
        {!mostraNovaLinha && (
          <button
            onClick={() => setMostraNovaLinha(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            <span>Nova Análise</span>
          </button>
        )}
      </div>

      {erro && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{erro}</div>
      )}

      {padroes.length === 0 && !carregando && (
        <div className="mb-4 p-4 bg-yellow-50 text-yellow-700 rounded-lg">
          ⚠️ Nenhum Padrão encontrado. Verifique o console (F12) para mais detalhes.
        </div>
      )}

      {mensagem && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
          {mensagem}
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Lote
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Categoria
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Produto
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Microrganismo
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Ponto
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Padrão Mín.
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Padrão Máx.
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Resultado
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* Linha de Nova Análise */}
              {mostraNovaLinha && (
                <tr className="bg-blue-50 hover:bg-blue-100">
                  {/* Lote (opcional) */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={novaAnalise.lote}
                      onChange={(e) => setNovaAnalise((prev) => ({ ...prev, lote: e.target.value }))}
                      placeholder="Opcional"
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Categoria */}
                  <td className="px-4 py-3">
                    <select
                      value={novaAnalise.categoria}
                      onChange={(e) => handleCategoriaChange(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Selecionar</option>
                      {categorias.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Produto */}
                  <td className="px-4 py-3">
                    <select
                      value={novaAnalise.produto}
                      onChange={(e) => handleProdutoChange(e.target.value)}
                      disabled={!novaAnalise.categoria}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                      required
                    >
                      <option value="">Selecionar</option>
                      {produtosFiltrados.map((prod) => (
                        <option key={prod._id} value={prod._id}>
                          {prod.nome}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Microrganismo */}
                  <td className="px-4 py-3">
                    <select
                      value={novaAnalise.microrganismo}
                      onChange={(e) => handleMicrorganismoChange(e.target.value)}
                      disabled={!novaAnalise.categoria}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                      required
                    >
                      <option value="">Selecionar</option>
                      {microrganismosFiltrados.map((micro) => (
                        <option key={micro} value={micro}>
                          {micro}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Ponto de Coleta */}
                  <td className="px-4 py-3">
                    <select
                      value={novaAnalise.ponto}
                      onChange={(e) => handlePontoChange(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Selecionar</option>
                      {pontosColeta.map((ponto) => (
                        <option key={ponto} value={ponto}>
                          {ponto}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Padrão Mínimo (automático) */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={novaAnalise.padraominimo}
                      disabled
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-700 font-semibold"
                    />
                  </td>

                  {/* Padrão Máximo (automático) */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={novaAnalise.padraomaximo}
                      disabled
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-700 font-semibold"
                    />
                  </td>

                  {/* Resultado */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={novaAnalise.resultado}
                      onChange={(e) => handleResultadoChange(e.target.value)}
                      placeholder="Vazio = pendente"
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </td>

                  {/* Status (automático) */}
                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        novaAnalise.status === 'APROVADO'
                          ? 'bg-green-100 text-green-800'
                          : novaAnalise.status === 'REPROVADO'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {novaAnalise.status || 'PENDENTE'}
                    </span>
                  </td>

                  <td></td>
                </tr>
              )}

              {/* Linha de Ações */}
              {mostraNovaLinha && (
                <tr className="bg-blue-50 border-t-2 border-indigo-300">
                  <td colSpan={10} className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={salvarNovaAnalise}
                        className="flex items-center space-x-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                      >
                        <Check size={16} />
                        <span>Salvar</span>
                      </button>
                      <button
                        onClick={cancelarNovaAnalise}
                        className="flex items-center space-x-1 bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors"
                      >
                        <X size={16} />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Análises existentes */}
              {analises.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    Nenhuma análise registrada
                  </td>
                </tr>
              ) : (
                analises.map((analise) => {
                  const padrao = padraoDe(analise.categoria, analise.microrganismo);
                  const emEdicao = editandoId === analise._id;

                  return (
                    <tr key={analise._id} className={emEdicao ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 text-sm">
                        {emEdicao ? (
                          <input
                            type="text"
                            value={edicao.lote}
                            onChange={(e) => setEdicao((prev) => ({ ...prev, lote: e.target.value }))}
                            placeholder="Opcional"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          analise.lote || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{analise.categoria}</td>
                      <td className="px-4 py-3 text-sm">{analise.produtoNome || getNomeProduto(analise.produtoId)}</td>
                      <td className="px-4 py-3 text-sm">{analise.microrganismo}</td>
                      <td className="px-4 py-3 text-sm">
                        {emEdicao ? (
                          <select
                            value={edicao.ponto}
                            onChange={(e) => setEdicao((prev) => ({ ...prev, ponto: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Selecionar</option>
                            {pontosColeta.map((ponto) => (
                              <option key={ponto} value={ponto}>
                                {ponto}
                              </option>
                            ))}
                          </select>
                        ) : (
                          analise.pontoColeta || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{padrao ? padrao.limiteMinimo : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{padrao ? padrao.limiteMaximo : '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {emEdicao ? (
                          <input
                            type="text"
                            value={edicao.resultado}
                            onChange={(e) => setEdicao((prev) => ({ ...prev, resultado: e.target.value }))}
                            placeholder="Vazio = pendente"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : analise.resultado !== null && analise.resultado !== undefined ? (
                          analise.resultado
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            analise.statusConformidade === 'APROVADO'
                              ? 'bg-green-100 text-green-800'
                              : analise.statusConformidade === 'REPROVADO'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {analise.statusConformidade}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {emEdicao ? (
                            <>
                              <button
                                onClick={salvarEdicao}
                                className="flex items-center space-x-1 text-green-700 hover:text-green-900 hover:bg-green-50 px-2 py-1 rounded transition-colors"
                                title="Salvar alterações"
                              >
                                <Check size={14} />
                                <span className="text-xs">Salvar</span>
                              </button>
                              <button
                                onClick={() => setEditandoId(null)}
                                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                title="Cancelar edição"
                              >
                                <X size={14} />
                                <span className="text-xs">Cancelar</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => iniciarEdicao(analise)}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                title="Editar análise"
                              >
                                <Edit2 size={14} />
                                <span className="text-xs">Editar</span>
                              </button>
                              <button
                                onClick={() => handleDeletarAnalise(analise._id)}
                                className="flex items-center space-x-1 text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                title="Deletar análise"
                              >
                                <Trash2 size={14} />
                                <span className="text-xs">Deletar</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
