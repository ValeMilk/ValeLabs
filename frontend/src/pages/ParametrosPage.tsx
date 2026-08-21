import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getUsuario } from '../services/api';
import { podeGerenciar } from '../lib/perfis';
import { AlertCircle, ArrowRight, Droplets, Edit2, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { PageTitle } from '../components/PageTitle';

interface Categoria {
  _id: string;
  nome: string;
  phMinimo: number;
  phMaximo: number;
  ativo: boolean;
}

interface PadraoResumo {
  _id: string;
  microrganismo: string;
  limiteMinimo: number;
  limiteMaximo: number;
  unidade: string;
  criticidade: string;
}

export function ParametrosPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasProdutos, setCategoriasProdutos] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria | null>(null);
  const [padroesDaCategoria, setPadroesDaCategoria] = useState<PadraoResumo[]>([]);
  const [carregandoPadroes, setCarregandoPadroes] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({ nome: '', phMinimo: '', phMaximo: '' });

  const navigate = useNavigate();

  useEffect(() => {
    if (!podeGerenciar(getUsuario()?.perfil)) {
      navigate('/dashboard');
      return;
    }
    carregarDados();
  }, [navigate]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [categoriasRes, produtosRes] = await Promise.all([
        api.get<any>('/parametros/categorias'),
        api.get<any>('/produtos'),
      ]);
      const listaCategorias: Categoria[] = categoriasRes.data.dados || [];
      setCategorias(listaCategorias);
      setCategoriasProdutos(
        Array.from(new Set<string>((produtosRes.data.dados || []).map((p: any) => p.categoria as string))).sort()
      );
      setErro('');
    } catch (err: any) {
      setErro('Erro ao carregar parâmetros');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const selecionarCategoria = async (categoria: Categoria) => {
    setCategoriaSelecionada(categoria);
    setCarregandoPadroes(true);
    try {
      const response = await api.get<any>(`/padroes/${encodeURIComponent(categoria.nome)}`);
      setPadroesDaCategoria(response.data.dados || []);
    } catch (err: any) {
      console.error(err);
      setPadroesDaCategoria([]);
    } finally {
      setCarregandoPadroes(false);
    }
  };

  const abrirNovo = () => {
    setEditando(null);
    setFormData({ nome: '', phMinimo: '', phMaximo: '' });
    setShowModal(true);
  };

  const abrirEditar = (categoria: Categoria) => {
    setEditando(categoria);
    setFormData({
      nome: categoria.nome,
      phMinimo: categoria.phMinimo.toString(),
      phMaximo: categoria.phMaximo.toString(),
    });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!formData.nome.trim() || formData.phMinimo === '' || formData.phMaximo === '') {
      setErro('Nome, pH mínimo e pH máximo são obrigatórios');
      return;
    }

    setSalvando(true);
    try {
      const dados = {
        nome: formData.nome.trim(),
        phMinimo: parseFloat(formData.phMinimo),
        phMaximo: parseFloat(formData.phMaximo),
      };

      if (editando) {
        await api.put(`/parametros/categorias/${editando._id}`, dados);
      } else {
        await api.post('/parametros/categorias', dados);
      }
      setShowModal(false);
      setErro('');
      await carregarDados();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao salvar categoria');
    } finally {
      setSalvando(false);
    }
  };

  const deletar = async (categoria: Categoria) => {
    if (!window.confirm(`Tem certeza que deseja deletar os parâmetros de "${categoria.nome}"?`)) return;

    try {
      await api.delete(`/parametros/categorias/${categoria._id}`);
      if (categoriaSelecionada?._id === categoria._id) {
        setCategoriaSelecionada(null);
        setPadroesDaCategoria([]);
      }
      setErro('');
      await carregarDados();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao deletar categoria');
    }
  };

  if (carregando) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <PageTitle
          icon={SlidersHorizontal}
          title="Parâmetros"
          subtitle="Parâmetros globais por categoria — faixa de pH e padrões de microrganismo"
        />
        <button
          onClick={abrirNovo}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span>Nova Categoria</span>
        </button>
      </div>

      {erro && (
        <div className="mb-6 p-3 bg-red-50 border border-red-300 rounded-lg flex items-center space-x-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-sm text-red-800">{erro}</p>
        </div>
      )}

      {categorias.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
          <SlidersHorizontal className="mx-auto text-gray-400 mb-4" size={40} />
          <p className="text-gray-700 font-medium">Nenhuma categoria de parâmetros cadastrada ainda</p>
          <p className="text-gray-500 text-sm mt-1">Crie uma categoria para definir a faixa de pH global dela.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Lista de categorias */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Categorias</h2>
            {categorias.map((cat) => (
              <div
                key={cat._id}
                onClick={() => selecionarCategoria(cat)}
                className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition-colors ${
                  categoriaSelecionada?._id === cat._id
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{cat.nome}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Droplets size={14} className="text-blue-500" />
                      pH {cat.phMinimo} – {cat.phMaximo}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirEditar(cat);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletar(cat);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Deletar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detalhe da categoria selecionada */}
          <div>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Detalhe</h2>
            {!categoriaSelecionada ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500 text-sm">
                Selecione uma categoria pra ver a faixa de pH e os padrões de microrganismo dela.
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{categoriaSelecionada.nome}</h3>
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold mb-6">
                  <Droplets size={16} />
                  pH {categoriaSelecionada.phMinimo} – {categoriaSelecionada.phMaximo}
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Padrões de microrganismo
                  </h4>
                  <Link
                    to={`/padroes?categoria=${encodeURIComponent(categoriaSelecionada.nome)}`}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Gerenciar padrões
                    <ArrowRight size={14} />
                  </Link>
                </div>

                {carregandoPadroes ? (
                  <p className="text-sm text-gray-500">Carregando...</p>
                ) : padroesDaCategoria.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum padrão de microrganismo cadastrado para esta categoria ainda.</p>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                          <th className="px-2 py-2">Microrganismo</th>
                          <th className="px-2 py-2">Mín.</th>
                          <th className="px-2 py-2">Máx.</th>
                          <th className="px-2 py-2">Criticidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {padroesDaCategoria.map((p) => (
                          <tr key={p._id}>
                            <td className="px-2 py-2 text-sm text-gray-900">{p.microrganismo}</td>
                            <td className="px-2 py-2 text-sm text-gray-600">{p.limiteMinimo} {p.unidade}</td>
                            <td className="px-2 py-2 text-sm text-gray-600">{p.limiteMaximo} {p.unidade}</td>
                            <td className="px-2 py-2 text-sm text-gray-600">{p.criticidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          />

          <div className="fixed inset-0 flex items-center justify-center z-[9999] px-4 pointer-events-none">
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl pointer-events-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editando ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoria *</label>
                  <input
                    type="text"
                    list="categorias-produtos"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: IOGURTE, PROTEICO, QUEIJO"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <datalist id="categorias-produtos">
                    {categoriasProdutos.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">
                    Use o mesmo nome já usado nos produtos, pra os parâmetros valerem pra eles.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">pH Mínimo *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.phMinimo}
                      onChange={(e) => setFormData({ ...formData, phMinimo: e.target.value })}
                      placeholder="4.0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">pH Máximo *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.phMaximo}
                      onChange={(e) => setFormData({ ...formData, phMaximo: e.target.value })}
                      placeholder="4.6"
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-6 border-t">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={salvando}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvar}
                    disabled={salvando}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
