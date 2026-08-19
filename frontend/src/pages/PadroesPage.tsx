import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUsuario } from '../services/api';
import { AlertCircle, Trash2, Edit2, Plus, CheckCircle } from 'lucide-react';
import { PageTitle } from '../components/PageTitle';

interface Padrao {
  _id: string;
  categoria: string;
  microrganismo: string;
  limiteMinimo: number;
  limiteMaximo: number;
  unidade: string;
  criticidade: string;
  vigem: string;
  ativo: boolean;
}

interface Microrganismo {
  _id: string;
  nome: string;
}

export function PadroesPage() {
  const [padroes, setPadroes] = useState<Padrao[]>([]);
  const [microrganismos, setMicrorganismos] = useState<Microrganismo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Padrao | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    categoria: '',
    microrganismo: '',
    limiteMinimo: '',
    limiteMaximo: '',
    unidade: 'UFC/mL',
    vigem: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const usuario = getUsuario();
    const perfisAutorizados = ['Admin', 'Diretora', 'Supervisora Qualidade'];
    if (!usuario || !perfisAutorizados.includes(usuario.perfil)) {
      navigate('/dashboard');
      return;
    }
    carregarDados();
  }, [navigate]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [padroesRes, microsRes] = await Promise.all([
        api.get<any>('/padroes'),
        api.get<any>('/microrganismos')
      ]);
      setPadroes(padroesRes.data.dados || []);
      setMicrorganismos(microsRes.data.dados || []);
      setErro('');
    } catch (err: any) {
      setErro('Erro ao carregar dados');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const abrirNovo = () => {
    setEditando(null);
    setFormData({
      categoria: '',
      microrganismo: '',
      limiteMinimo: '',
      limiteMaximo: '',
      unidade: 'UFC/mL',
      vigem: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const abrirEditar = (padrao: Padrao) => {
    setEditando(padrao);
    // Se for um ID (24+ caracteres hex), busca o ID real; senão trata como nome antigo
    let microId = padrao.microrganismo;
    if (microId.length < 24) {
      // É um nome, não um ID - procura o micro com esse nome
      const micro = microrganismos.find(m => m.nome === microId);
      microId = micro?._id || padrao.microrganismo;
    }
    setFormData({
      categoria: padrao.categoria,
      microrganismo: microId,
      limiteMinimo: padrao.limiteMinimo.toString(),
      limiteMaximo: padrao.limiteMaximo.toString(),
      unidade: padrao.unidade,
      vigem: padrao.vigem.split('T')[0]
    });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!formData.categoria.trim() || !formData.microrganismo || !formData.limiteMinimo || !formData.limiteMaximo) {
      setErro('Categoria, microrganismo e limites são obrigatórios');
      return;
    }

    setSalvando(true);
    try {
      const dados = {
        categoria: formData.categoria.trim(),
        microrganismo: formData.microrganismo,
        limiteMinimo: parseFloat(formData.limiteMinimo),
        limiteMaximo: parseFloat(formData.limiteMaximo),
        unidade: formData.unidade,
        vigem: formData.vigem
      };

      if (editando) {
        await api.put(`/padroes/${editando._id}`, dados);
      } else {
        await api.post('/padroes', dados);
      }
      setShowModal(false);
      setErro('');
      await carregarDados();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao salvar padrão');
    } finally {
      setSalvando(false);
    }
  };

  const deletar = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este padrão?')) return;

    try {
      await api.delete(`/padroes/${id}`);
      setErro('');
      await carregarDados();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao deletar padrão');
    }
  };

  const padroesFiltrados = filtroCategoria
    ? padroes.filter(p => p.categoria === filtroCategoria)
    : padroes;

  const categorias = [...new Set(padroes.map(p => p.categoria))];

  // Função para obter nome do microrganismo pelo ID
  const getNomeMicrorganismo = (microrganismoId: string): string => {
    // Se não for um ObjectId (tem menos de 24 caracteres ou não é hex), é o nome
    if (microrganismoId.length < 24) {
      return microrganismoId;
    }
    
    const micro = microrganismos.find(m => m._id === microrganismoId);
    return micro?.nome || microrganismoId;
  };

  if (carregando) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <PageTitle
          icon={CheckCircle}
          title="Padrões"
          subtitle="Defina os padrões mínimos e máximos para cada microrganismo por categoria"
        />
        <button
          onClick={abrirNovo}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span>Novo Padrão</span>
        </button>
      </div>

      {erro && (
        <div className="mb-6 p-3 bg-red-50 border border-red-300 rounded-lg flex items-center space-x-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-sm text-red-800">{erro}</p>
        </div>
      )}

      {categorias.length > 0 && (
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFiltroCategoria('')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filtroCategoria === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todas ({padroes.length})
          </button>
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
              {cat} ({padroes.filter(p => p.categoria === cat).length})
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Categoria</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Microrganismo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Mínimo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Máximo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Criticidade</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {padroesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {padroes.length === 0 ? 'Nenhum padrão cadastrado' : 'Nenhum padrão nesta categoria'}
                </td>
              </tr>
            ) : (
              padroesFiltrados.map((padrao) => (
                <tr key={padrao._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{padrao.categoria}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{getNomeMicrorganismo(padrao.microrganismo)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{padrao.limiteMinimo} {padrao.unidade}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{padrao.limiteMaximo} {padrao.unidade}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      padrao.criticidade === 'CRÍTICO'
                        ? 'bg-red-100 text-red-800'
                        : padrao.criticidade === 'ATENÇÃO'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {padrao.criticidade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => abrirEditar(padrao)}
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1"
                    >
                      <Edit2 size={16} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => deletar(padrao._id)}
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
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl pointer-events-auto max-h-[90vh] overflow-y-auto" 
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editando ? 'Editar Padrão' : 'Novo Padrão'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="Ex: Alimentos, Água, Cosméticos"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Microrganismo *
                  </label>
                  <select
                    value={formData.microrganismo}
                    onChange={(e) => setFormData({ ...formData, microrganismo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione um microrganismo</option>
                    {microrganismos.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mínimo *
                    </label>
                    <input
                      type="number"
                      value={formData.limiteMinimo}
                      onChange={(e) => setFormData({ ...formData, limiteMinimo: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Máximo *
                    </label>
                    <input
                      type="number"
                      value={formData.limiteMaximo}
                      onChange={(e) => setFormData({ ...formData, limiteMaximo: e.target.value })}
                      placeholder="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Unidade
                  </label>
                  <input
                    type="text"
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                    placeholder="UFC/mL"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vigência
                  </label>
                  <input
                    type="date"
                    value={formData.vigem}
                    onChange={(e) => setFormData({ ...formData, vigem: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
