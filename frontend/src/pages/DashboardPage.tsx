import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import { DashboardCategoria, Criticidade } from '../types/shared-types';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

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
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case Criticidade.ATENÇÃO:
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case Criticidade.CONFORME:
        return 'bg-green-50 border-green-200 hover:bg-green-100';
    }
  };

  const getIcone = (criticidade: Criticidade) => {
    switch (criticidade) {
      case Criticidade.CRÍTICO:
        return <AlertCircle className="text-red-600" size={24} />;
      case Criticidade.ATENÇÃO:
        return <AlertTriangle className="text-yellow-600" size={24} />;
      case Criticidade.CONFORME:
        return <CheckCircle className="text-green-600" size={24} />;
    }
  };

  if (carregando) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-8">Visão geral de todas as categorias</p>

        {erro && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{erro}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categorias.map((cat) => (
            <div
              key={cat.categoria}
              onClick={() => navigate(`/categorias/${cat.categoria}`)}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all transform hover:scale-105 ${getCor(
                cat.criticidade
              )}`}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {cat.categoria}
                </h3>
                {getIcone(cat.criticidade)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">{cat.totalAnalises}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Aprovadas:</span>
                  <span className="font-medium text-green-600">
                    {cat.aprovadas}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Reprovadas:</span>
                  <span className="font-medium text-red-600">
                    {cat.reprovadas}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">Pendentes:</span>
                  <span className="font-medium text-yellow-600">
                    {cat.pendentes}
                  </span>
                </div>
              </div>

              {cat.totalAnalises > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-600">
                    Taxa de aprovação:{' '}
                    <span className="font-bold">
                      {Math.round(
                        (cat.aprovadas / cat.totalAnalises) * 100
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
