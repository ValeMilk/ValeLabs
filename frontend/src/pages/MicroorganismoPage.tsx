import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getUsuario } from '../services/api';
import { AlertCircle, Trash2, Edit2, Plus } from 'lucide-react';

interface Microrganismo {
  _id: string;
  nome: string;
  ativo: boolean;
}

export function MicroorganismoPage() {
  const [microrganismos, setMicrorganismos] = useState<Microrganismo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Microrganismo | null>(null);
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const usuario = getUsuario();
    const perfisAutorizados = ['Admin', 'Diretora', 'Supervisora Qualidade'];
    if (!usuario || !perfisAutorizados.includes(usuario.perfil)) {
      navigate('/dashboard');
      return;
    }
    carregarMicrorganismos();
  }, [navigate]);

  const carregarMicrorganismos = async () => {
    try {
      setCarregando(true);
      const response = await api.get<any>('/microrganismos');
      setMicrorganismos(response.data.dados || []);
      setErro('');
    } catch (err: any) {
      setErro('Erro ao carregar microrganismos');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const abrirNovo = () => {
    setEditando(null);
    setNome('');
    setShowModal(true);
  };

  const abrirEditar = (micro: Microrganismo) => {
    setEditando(micro);
    setNome(micro.nome);
    setShowModal(true);
  };

  const salvar = async () => {
    if (!nome.trim()) {
      setErro('Nome é obrigatório');
      return;
    }

    setSalvando(true);
    try {
      if (editando) {
        // Atualizar
        await api.put(`/microrganismos/${editando._id}`, { nome: nome.trim() });
      } else {
        // Criar
        await api.post('/microrganismos', { nome: nome.trim() });
      }
      setShowModal(false);
      setErro('');
      await carregarMicrorganismos();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao salvar microrganismo');
    } finally {
      setSalvando(false);
    }
  };

  const deletar = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este microrganismo?')) return;

    try {
      await api.delete(`/microrganismos/${id}`);
      setErro('');
      await carregarMicrorganismos();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao deletar microrganismo');
    }
  };

  if (carregando) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Microrganismos</h1>
          <p className="text-gray-600 mt-1">Cadastre os microrganismos que serão analisados</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span>Novo Microrganismo</span>
        </button>
      </div>

      {erro && (
        <div className="mb-6 p-3 bg-red-50 border border-red-300 rounded-lg flex items-center space-x-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-sm text-red-800">{erro}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {microrganismos.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  Nenhum microrganismo cadastrado
                </td>
              </tr>
            ) : (
              microrganismos.map((micro) => (
                <tr key={micro._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{micro.nome}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      micro.ativo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {micro.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => abrirEditar(micro)}
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1"
                    >
                      <Edit2 size={16} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => deletar(micro._id)}
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

      {/* Modal */}
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
                {editando ? 'Editar Microrganismo' : 'Novo Microrganismo'}
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: E. coli, Salmonella, Listeria"
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
