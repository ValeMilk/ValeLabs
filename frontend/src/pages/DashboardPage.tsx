import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import type { DashboardCategoria } from '../types/shared-types';
import { Criticidade } from '../types/shared-types';
import { AlertCircle, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

export function DashboardPage() {
  const [categorias, setCategorias] = useState<DashboardCategoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    carregarCategorias();
  }, []);

  const carregarCategorias = async () => {
    try {
      setCarregando(true);
      const response = await api.get('/dashboard/categorias');
      setCategorias(response.data.dados || []);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao carregar categorias');
    } finally {
      setCarregando(false);
    }
  };

  const getCor = (criticidade: Criticidade) => {
    switch (criticidade) {
      case Criticidade.CRÍTICO:
        return {
          bg: 'bg-gradient-to-br from-red-50 to-red-100',
          border: 'border-red-300',
          icon: 'text-red-600',
          accent: 'bg-red-600'
        };
      case Criticidade.ATENÇÃO:
        return {
          bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
          border: 'border-yellow-300',
          icon: 'text-yellow-600',
          accent: 'bg-yellow-600'
        };
      case Criticidade.CONFORME:
        return {
          bg: 'bg-gradient-to-br from-green-50 to-green-100',
          border: 'border-green-300',
          icon: 'text-green-600',
          accent: 'bg-green-600'
        };
    }
  };

  const getIcone = (criticidade: Criticidade) => {
    switch (criticidade) {
      case Criticidade.CRÍTICO:
        return <AlertCircle className="text-red-600" size={32} />;
      case Criticidade.ATENÇÃO:
        return <AlertTriangle className="text-yellow-600" size={32} />;
      case Criticidade.CONFORME:
        return <CheckCircle className="text-green-600" size={32} />;
    }
  };

  if (carregando) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  const totalAnalises = categorias.reduce((sum, cat) => sum + cat.totalAnalises, 0);
  const totalAprovadas = categorias.reduce((sum, cat) => sum + cat.aprovadas, 0);
  const totalReprovadas = categorias.reduce((sum, cat) => sum + cat.reprovadas, 0);
  const totalPendentes = categorias.reduce((sum, cat) => sum + cat.pendentes, 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Visão geral de todas as categorias e análises microbiológicas</p>
        </div>

        {erro && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{erro}</div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total de Análises</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalAnalises}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Aprovadas</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{totalAprovadas}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Reprovadas</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{totalReprovadas}</p>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="text-red-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{totalPendentes}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <AlertTriangle className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Categorias de Produtos</h2>

        {categorias.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <p className="text-blue-900 text-lg">Nenhuma categoria encontrada</p>
            <p className="text-blue-700 mt-2">Crie uma análise para começar a usar o sistema</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categorias.map((cat) => {
              const cores = getCor(cat.criticidade);
              return (
                <div
                  key={cat.categoria}
                  onClick={() => navigate(`/categorias/${cat.categoria}`)}
                  className={`${cores.bg} rounded-lg border-2 ${cores.border} cursor-pointer transition-all transform hover:scale-105 shadow-md overflow-hidden`}
                >
                  <div className={`${cores.accent} h-1`}></div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{cat.categoria}</h3>
                      {getIcone(cat.criticidade)}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Taxa de Conformidade</span>
                        <span className="text-sm font-bold text-gray-900">
                          {Math.round((cat.aprovadas / (cat.totalAnalises || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2">
                        <div
                          className={`${cores.accent} h-2 rounded-full`}
                          style={{
                            width: `${(cat.aprovadas / (cat.totalAnalises || 1)) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white bg-opacity-60 rounded p-3">
                        <p className="text-xs text-gray-600 font-medium">Total</p>
                        <p className="text-2xl font-bold text-gray-900">{cat.totalAnalises}</p>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded p-3">
                        <p className="text-xs text-green-600 font-medium">✓ Aprovadas</p>
                        <p className="text-2xl font-bold text-green-600">{cat.aprovadas}</p>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded p-3">
                        <p className="text-xs text-red-600 font-medium">✗ Reprovadas</p>
                        <p className="text-2xl font-bold text-red-600">{cat.reprovadas}</p>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded p-3">
                        <p className="text-xs text-yellow-600 font-medium">⧖ Pendentes</p>
                        <p className="text-2xl font-bold text-yellow-600">{cat.pendentes}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
                      )}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {categorias.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma categoria encontrada</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
