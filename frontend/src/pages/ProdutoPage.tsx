import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChartComparacao } from '../components/BarChartComparacao';
import { api } from '../services/api';
import type { Analise } from '../types/shared-types';

export function ProdutoPage() {
  const { produtoId } = useParams<{ produtoId: string }>();
  const [produtoNome, setProdutoNome] = useState('');
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarDados();
  }, [produtoId]);

  const carregarDados = async () => {
    if (!produtoId) return;

    try {
      setCarregando(true);
      const response = await api.get(`/dashboard/produto/${produtoId}`);
      setProdutoNome(response.data.dados?.produto?.nome || produtoId);
      setAnalises(response.data.dados?.analises || []);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return (
        <div className="flex justify-center items-center h-96">
          <div className="text-gray-500">Carregando...</div>
        </div>
    );
  }

  return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Produto: {produtoNome}
        </h1>
        <p className="text-gray-600 mb-8">
          Análises de microrganismos por ponto de coleta
        </p>

        {erro && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{erro}</div>
        )}

        <div className="space-y-8">
          <BarChartComparacao
            analises={analises}
            agruparPor="microrganismo"
            titulo="Últimas Análises por Microrganismo"
          />

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Detalhes das Análises
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="text-left p-3">Microrganismo</th>
                    <th className="text-left p-3">Ponto de Coleta</th>
                    <th className="text-left p-3">Resultado</th>
                    <th className="text-left p-3">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {analises.map((analise) => (
                    <tr key={analise._id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{analise.microrganismo}</td>
                      <td className="p-3">{analise.pontoColeta}</td>
                      <td className="p-3">
                        {analise.resultado || '-'} {analise.padraoVigenteSnapshot?.unidade}
                      </td>
                      <td className="p-3">
                        {new Date(analise.criadoEm).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {analises.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma análise encontrada</p>
          </div>
        )}
      </div>
  );
}
