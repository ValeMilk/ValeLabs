import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import { Criticidade } from '../types/shared-types';
import type { Padrao, CriarPadraoRequest } from '../types/shared-types';
import { Plus, Trash2 } from 'lucide-react';

export function PadroesPage() {
  const [padroes, setPadroes] = useState<Padrao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostraForm, setMostraForm] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const [form, setForm] = useState<CriarPadraoRequest>({
    categoria: '',
    microrganismo: '',
    limiteMinimo: 0,
    limiteMaximo: 100,
    unidade: 'UFC/mL',
    criticidade: Criticidade.CONFORME,
    vigem: new Date().toISOString().split('T')[0],
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
    carregarPadroes();
  }, []);

  const carregarPadroes = async () => {
    try {
      setCarregando(true);
      const response = await api.get('/padrões');
      setPadroes(response.data.dados || []);
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao carregar padrões');
    } finally {
      setCarregando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setMensagem('');

    try {
      await api.post('/padrões', form);
      setMensagem('Padrão criado com sucesso!');
      setForm({
        categoria: '',
        microrganismo: '',
        limiteMinimo: 0,
        limiteMaximo: 100,
        unidade: 'UFC/mL',
        criticidade: Criticidade.CONFORME,
        vigem: new Date().toISOString().split('T')[0],
      });
      setMostraForm(false);
      carregarPadroes();
    } catch (err: any) {
      setErro(err.response?.data?.mensagem || 'Erro ao criar padrão');
    }
  };

  const handleDeletar = async (padraoId: string) => {
    if (confirm('Tem certeza que deseja deletar este padrão?')) {
      try {
        await api.delete(`/padrões/${padraoId}`);
        setMensagem('Padrão deletado com sucesso!');
        carregarPadroes();
      } catch (err: any) {
        setErro(err.response?.data?.mensagem || 'Erro ao deletar padrão');
      }
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
            <h1 className="text-3xl font-bold text-gray-900">Padrões</h1>
            <p className="text-gray-600">
              Gerencie os padrões de qualidade microbiológica
            </p>
          </div>
          <button
            onClick={() => setMostraForm(!mostraForm)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            <span>Novo Padrão</span>
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
              Novo Padrão
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite Mínimo
                </label>
                <input
                  type="number"
                  value={form.limiteMinimo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      limiteMinimo: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite Máximo
                </label>
                <input
                  type="number"
                  value={form.limiteMaximo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      limiteMaximo: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade
                </label>
                <input
                  type="text"
                  value={form.unidade}
                  onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Criticidade
                </label>
                <select
                  value={form.criticidade}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      criticidade: e.target.value as Criticidade,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                >
                  <option value={Criticidade.CONFORME}>Conforme</option>
                  <option value={Criticidade.ATENÇÃO}>Atenção</option>
                  <option value={Criticidade.CRÍTICO}>Crítico</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Vigência
                </label>
                <input
                  type="date"
                  value={form.vigem}
                  onChange={(e) => setForm({ ...form, vigem: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div className="col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Criar
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

        {/* Lista de padrões */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Padrões Cadastrados
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="text-left p-3">Categoria</th>
                  <th className="text-left p-3">Microrganismo</th>
                  <th className="text-left p-3">Limite Mín.</th>
                  <th className="text-left p-3">Limite Máx.</th>
                  <th className="text-left p-3">Unidade</th>
                  <th className="text-left p-3">Criticidade</th>
                  <th className="text-left p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {padroes.map((padrao) => (
                  <tr key={padrao._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{padrao.categoria}</td>
                    <td className="p-3">{padrao.microrganismo}</td>
                    <td className="p-3">{padrao.limiteMinimo}</td>
                    <td className="p-3">{padrao.limiteMaximo}</td>
                    <td className="p-3">{padrao.unidade}</td>
                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          padrao.criticidade === Criticidade.CRÍTICO
                            ? 'bg-red-100 text-red-700'
                            : padrao.criticidade === Criticidade.ATENÇÃO
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {padrao.criticidade}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeletar(padrao._id!)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
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
