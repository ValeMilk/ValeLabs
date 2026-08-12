import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AlertCircle, Trash2, Edit2, Plus } from 'lucide-react';

interface Produto {
  _id: string;
  nome: string;
  categoria: string;
  descricao?: string;
  ativo: boolean;
  criadoEm: string;
}

export function CategoriaPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [formData, setFormData] = useState({
    categoria: '',
    nome: '',
    descricao: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const response = await api.get<any>('/produtos');
      const produtosData = response.data.dados || [];
      setProdutos(produtosData);
      
      const cats = Array.from(new Set(produtosData.map((p: Produto) => p.categoria))) as string[];
      setCategorias(cats);
      
      if (cats.length > 0 && !filtroCategoria) {
        setFiltroCategoria(cats[0]);
      }
      setErro('');
    } catch (err: any) {
      setErro('Erro ao carregar produtos');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const abrirNovo = () => {
    setEditando(null);
    setFormData({
      categoria: filtroCategoria || '',
      nome: '',
      descricao: ''
    });
    setShowModal(true);
  };

  const abrirEditar = (produto: Produto) => {
    setEditando(produto);
    setFormData({
      categoria: produto.categoria,
      nome: produto.nome,
      descricao: produto.descricao || ''
    });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!formData.categoria.trim() || !formData.nome.trim()) {
      setErro('Categoria e nome do produto são obrigatórios');
      return;
    }

    setSalvando(true);
    try {
      const dados = {
        categoria: formData.categoria.trim(),
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim()
      };

      if (editando) {
        await api.put(`/produtos/${editando._id}`, dados);
      } else {
        await api.post('/produtos', dados);
      }
      
      setShowModal(false);
      setErro('');
      await carregarDados();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao salvar produto');
    } finally {
      setSalvando(false);
    }
  };

  const deletar = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este produto?')) return;

    try {
      await api.delete(`/produtos/${id}`);
      setErro('');
      await carregarDados();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao deletar produto');
    }
  };

  const produtosFiltrados = filtroCategoria
    ? produtos.filter(p => p.categoria === filtroCategoria)
    : produtos;

  if (carregando) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categorias & Produtos</h1>
          <p className="text-gray-600 mt-1">Organize produtos por categorias</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span>Novo Produto</span>
        </button>
      </div>

      {erro && (
        <div className="mb-6 p-3 bg-red-50 border border-red-300 rounded-lg flex items-center space-x-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-sm text-red-800">{erro}</p>
        </div>
      )}

      {categorias.length > 0 && (
        <div className="mb-6 flex gap-2 flex-wrap">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filtroCategoria === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {cat} ({produtos.filter(p => p.categoria === cat).length})
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Categoria</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Produto</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Descrição</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {produtosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Nenhum produto nesta categoria
                </td>
              </tr>
            ) : (
              produtosFiltrados.map((produto) => (
                <tr key={produto._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{produto.categoria}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700">{produto.nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{produto.descricao || '-'}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => abrirEditar(produto)}
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1"
                    >
                      <Edit2 size={16} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => deletar(produto._id)}
                      className="text-red-600 hover:text-red-800 inline-flex items-center space-x-1"
                    >
                      <Trash2 size={16} />
                      <span>Deletar</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <>
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowModal(false);
              }
            }}
          />
          
          <div className="fixed inset-0 flex items-center justify-center z-[9999] px-4 pointer-events-none">
            <div 
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl pointer-events-auto" 
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editando ? 'Editar Produto' : 'Novo Produto'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categorias.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Leite Integral 1L"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição opcional do produto"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
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
