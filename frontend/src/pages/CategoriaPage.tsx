import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LineChartTendencia } from '../components/LineChartTendencia';
import { BarChartComparacao } from '../components/BarChartComparacao';
import { api } from '../services/api';
import type { Analise, TendenciaAgregada } from '../types/shared-types';

type Periodo = '7d' | '30d' | '90d' | '1y';

export function CategoriaPage() {
  const { categoria } = useParams<{ categoria: string }>();
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [tendencias, setTendencias] = useState<TendenciaAgregada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarDados();
  }, [categoria, periodo]);

  const carregarDados = async () => {
    if (!categoria) return;

    try {
      setCarregando(true);
      
      // Buscar análises da categoria
      const resAnalises = await api.get(
        `/dashboard/categoria/${categoria}?periodo=${periodo}`
      );
      setAnalises(resAnalises.data.dados?.analises || []);
      setTendencias(resAnalises.data.dados?.tendencias || []);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao carregar dados');
    } finally {
      setCarregando(false);
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Categoria: {categoria}
          </h1>
          <p className="text-gray-600">
            Análise detalhada de microrganismos nesta categoria
          </p>
        </div>

        {erro && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{erro}</div>
        )}

        {/* Selector de período */}
        <div className="mb-6 flex gap-2">
          {(['7d', '30d', '90d', '1y'] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                periodo === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {p === '7d'
                ? '7 dias'
                : p === '30d'
                ? '30 dias'
                : p === '90d'
                ? '90 dias'
                : '1 ano'}
            </button>
          ))}
        </div>

        {/* Gráficos */}
        <div className="space-y-8">
          <LineChartTendencia
            data={tendencias}
            titulo="Tendência de Aprovação por Microrganismo"
          />

          <BarChartComparacao
            analises={analises}
            agruparPor="microrganismo"
            titulo="Últimas Análises vs Limites Máximos"
          />
        </div>

        {analises.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Nenhuma análise encontrada para este período
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
