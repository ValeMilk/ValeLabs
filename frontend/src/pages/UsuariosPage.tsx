import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { getUsuario } from '../services/api';
import { AlertCircle, Trash2, Edit2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Usuario {
  _id: string;
  nome: string;
  perfil: 'Admin' | 'Diretora' | 'Qualidade';
  ativo: boolean;
}

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({ nome: '', perfil: 'Qualidade', senha: '' });
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const usuario = getUsuario();
    if (usuario?.perfil !== 'Admin') {
      navigate('/dashboard');
      return;
    }
    carregarUsuarios();
  }, [navigate]);

  const carregarUsuarios = async () => {
    try {
      setCarregando(true);
      const response = await api.get<any>('/admin/usuarios');
      setUsuarios(response.data.dados || []);
      setErro('');
    } catch (err: any) {
      setErro('Erro ao carregar usuários');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const abrirNovoUsuario = () => {
    setEditando(null);
    setFormData({ nome: '', perfil: 'Qualidade', senha: '' });
    setShowModal(true);
  };

  const abrirEditar = (usuario: Usuario) => {
    setEditando(usuario);
    setFormData({ nome: usuario.nome, perfil: usuario.perfil, senha: '' });
    setShowModal(true);
  };

  const salvarUsuario = async () => {
    if (!formData.nome.trim()) {
      setErro('Nome é obrigatório');
      return;
    }

    setSalvando(true);
    try {
      if (editando) {
        // Atualizar
        const dadosAtualizacao: any = {
          nome: formData.nome,
          perfil: formData.perfil,
        };
        await api.put(`/admin/usuarios/${editando._id}`, dadosAtualizacao);
      } else {
        // Criar
        if (!formData.senha.trim()) {
          setErro('Senha é obrigatória para novo usuário');
          setSalvando(false);
          return;
        }
        await api.post('/admin/usuarios', {
          nome: formData.nome,
          perfil: formData.perfil,
          senha: formData.senha,
        });
      }
      setShowModal(false);
      setErro('');
      await carregarUsuarios();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao salvar usuário');
    } finally {
      setSalvando(false);
    }
  };

  const deletarUsuario = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      await api.delete(`/admin/usuarios/${id}`);
      setErro('');
      await carregarUsuarios();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao deletar usuário');
    }
  };

  if (carregando) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 mt-1">Adicione, edite ou remova usuários do sistema</p>
        </div>
        <button
          onClick={abrirNovoUsuario}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          <span>Novo Usuário</span>
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Perfil</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Nenhum usuário cadastrado
                </td>
              </tr>
            ) : (
              usuarios.map((usuario) => (
                <tr key={usuario._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{usuario.nome}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {usuario.perfil}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      usuario.ativo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => abrirEditar(usuario)}
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1"
                    >
                      <Edit2 size={16} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => deletarUsuario(usuario._id)}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {editando ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do usuário"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil
                </label>
                <select
                  value={formData.perfil}
                  onChange={(e) => setFormData({ ...formData, perfil: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Qualidade">Qualidade</option>
                  <option value="Diretora">Diretora</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {!editando && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={salvando}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarUsuario}
                  disabled={salvando}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
