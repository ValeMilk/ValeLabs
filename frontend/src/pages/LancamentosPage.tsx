import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import type { Analise, Produto, CriarAnaliseRequest } from '../types/shared-types';
import { Plus } from 'lucide-react';

export function LancamentosPage() {
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [form, setForm] = useState<CriarAnaliseRequest>({
    dataInoculacao: new Date().toISOString().split('T')[0],
    dataPrevistaLeitura: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    produtoId: '',
    categoria: '',
    pontoColeta: '',
    microrganismo: '',
  });

  const categorias = [
    'Leite Cru',
    'Leite Pasteurizado',
    'Leite UHT',
    'Iogurte',
    'Queijo',
  ];
  const microrganismos = [
    'E. coli',
    'Salmonella',
    'Listeria',
    'Staphylococcus',
    'Coliformes',
  ];

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [resAnalises, resProdutos] = await Promise.all([
        api.get('/análises?limite=50'),
        api.get('/produtos'),
      ]);
      setAnalises(resAnalises.data.dados?.dados || []);
      setProdutos(resProdutos.data.dados || []);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setMensagem('');

    try {
      await api.post('/análises', form);
      setMensagem('Análise lançada com sucesso!');
      setForm({
        dataInoculacao: new Date().toISOString().split('T')[0],
        dataPrevistaLeitura: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        produtoId: '',
        categoria: '',
        pontoColeta: '',
        microrganismo: '',
      });
      setMostraForm(false);
      carregarDados();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao lançar análise');
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lançamentos</h1>
            <p className="text-gray-600">Registre novas análises de laboratório</p>
          </div>
          <button
            onClick={() => setMostraForm(!mostraForm)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            <span>Nova Análise</span>
          </button>
        </div>

        {erro && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{erro}</div>
        )}

        {mensagem && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
            {mensagem}
          </div>
        )}

        {/* Formulário */}
        {mostraForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Nova Análise
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Inoculação
                </label>
                <input
                  type="date"
                  value={form.dataInoculacao}
                  onChange={(e) =>
                    setForm({ ...form, dataInoculacao: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Prevista de Leitura
                </label>
                <input
                  type="date"
                  value={form.dataPrevistaLeitura}
                  onChange={(e) =>
                    setForm({ ...form, dataPrevistaLeitura: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Produto
                </label>
                <select
                  value={form.produtoId}
                  onChange={(e) =>
                    setForm({ ...form, produtoId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map((p) => (
                    <option key={p._id} value={p._id!}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={form.categoria}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ponto de Coleta
                </label>
                <input
                  type="text"
                  value={form.pontoColeta}
                  onChange={(e) =>
                    setForm({ ...form, pontoColeta: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Microrganismo
                </label>
                <select
                  value={form.microrganismo}
                  onChange={(e) =>
                    setForm({ ...form, microrganismo: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                >
                  <option value="">Selecione um microrganismo</option>
                  {microrganismos.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Lançar
                </button>
                <button
                  type="button"
                  onClick={() => setMostraForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de análises */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Últimas Análises
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="text-left p-3">Produto</th>
                  <th className="text-left p-3">Categoria</th>
                  <th className="text-left p-3">Microrganismo</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Data Inoculação</th>
                </tr>
              </thead>
              <tbody>
                {analises.map((analise) => (
                  <tr key={analise._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{analise.produtoId}</td>
                    <td className="p-3">{analise.categoria}</td>
                    <td className="p-3">{analise.microrganismo}</td>
                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          analise.statusConformidade === 'APROVADO'
                            ? 'bg-green-100 text-green-700'
                            : analise.statusConformidade === 'REPROVADO'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {analise.statusConformidade}
                      </span>
                    </td>
                    <td className="p-3">
                      {new Date(analise.dataInoculacao).toLocaleDateString(
                        'pt-BR'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
