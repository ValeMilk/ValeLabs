import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getUsuarios } from '../services/api';
import { AlertCircle } from 'lucide-react';

export function LoginPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const data = await getUsuarios();
      setUsuarios(data);
      if (data.length > 0) {
        setUsuarioSelecionado(data[0].nome);
      }
    } catch (err) {
      setErro('Erro ao carregar usuários');
    } finally {
      setCarregandoUsuarios(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await login(usuarioSelecionado, senha);
      navigate('/dashboard');
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao fazer login');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Vale Labs" className="h-20 w-auto mx-auto mb-4" />
            <p className="text-sm text-gray-500 font-medium">Acompanhamento Microbiológico</p>
          </div>

          {erro && (
            <div className="mb-6 p-3 bg-red-50 border border-red-300 rounded-lg flex items-center space-x-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{erro}</p>
            </div>
          )}

          {carregandoUsuarios ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando usuários...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuário
                </label>
                <select
                  value={usuarioSelecionado}
                  onChange={(e) => setUsuarioSelecionado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                >
                  {usuarios.map((usuario) => (
                    <option key={usuario._id} value={usuario.nome}>
                      {usuario.nome} ({usuario.perfil})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {carregando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Sistema de Controle de Qualidade Microbiológica
          </p>
        </div>
      </div>
    </div>
  );
}
