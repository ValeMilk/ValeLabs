import { Produto } from "../models/Produto";
import { Analise } from "../models/Analise";

export class ProdutosService {
  /**
   * Listar todos os produtos ativos
   */
  async listarTodos(filtros?: { categoria?: string; ativo?: boolean }) {
    const query: any = { ativo: filtros?.ativo !== false };
    
    if (filtros?.categoria) {
      query.categoria = filtros.categoria;
    }

    return await Produto.find(query).sort({ categoria: 1, nome: 1 });
  }

  /**
   * Obter produto por ID
   */
  async obter(id: string) {
    const produto = await Produto.findById(id);
    if (!produto) {
      throw new Error("Produto não encontrado");
    }
    return produto;
  }

  /**
   * Criar produto
   */
  async criar(dados: { nome: string; categoria: string; descricao?: string }) {
    const existe = await Produto.findOne({ nome: dados.nome });
    if (existe) {
      throw new Error("Produto com este nome já existe");
    }

    const produto = new Produto(dados);
    return await produto.save();
  }

  /**
   * Contar análises por produto
   */
  async contarAnalises(produtoId: string): Promise<number> {
    return await Analise.countDocuments({ produtoId });
  }

  /**
   * Listar produtos com contagem de análises
   */
  async listarComContagem() {
    const produtos = await this.listarTodos();
    
    return Promise.all(
      produtos.map(async (p) => ({
        _id: p._id,
        nome: p.nome,
        categoria: p.categoria,
        descricao: p.descricao,
        ativo: p.ativo,
        criadoEm: p.criadoEm,
        totalAnalises: await this.contarAnalises(p._id!.toString())
      }))
    );
  }
}
