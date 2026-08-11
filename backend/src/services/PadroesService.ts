import { Padrao, IPadraoDocument } from "../models/Padrao";
import { CriarPadraoRequest } from "../types/shared-types";

export class PadroesService {
  /**
   * Criar novo padrão
   * Se já existe um padrão ativo para a mesma categoria × microrganismo,
   * inativa o antigo (defini vigemAte)
   */
  async criarPadrao(
    data: CriarPadraoRequest,
    usuarioId: string
  ): Promise<IPadraoDocument> {
    const chaveComposta = `${data.categoria}|${data.microrganismo}`;
    const vigemDe = new Date(data.vigemDe);

    // 1. Validar que não existe outro padrão ativo na mesma data
    const existente = await Padrao.findOne({
      chaveComposta,
      vigemDe: { $lte: vigemDe },
      $or: [
        { vigemAte: null },
        { vigemAte: { $gt: vigemDe } }
      ],
      ativo: true
    });

    if (existente) {
      // Inativar o padrão anterior
      await Padrao.updateOne(
        { _id: existente._id },
        {
          vigemAte: new Date(new Date(vigemDe).getTime() - 1000), // 1 segundo antes
          ativo: false
        }
      );
    }

    // 2. Criar novo padrão
    const noPadrao = new Padrao({
      categoria: data.categoria,
      microrganismo: data.microrganismo,
      chaveComposta,
      
      limiteIdeal: data.limiteIdeal,
      limiteMaximo: data.limiteMaximo,
      
      vigemDe,
      vigemAte: data.vigemAte ? new Date(data.vigemAte) : null,
      ativo: true,
      
      criadoPor: usuarioId,
      criadoEm: new Date(),
      observacoes: data.observacoes
    });

    await noPadrao.save();
    return noPadrao;
  }

  /**
   * Listar padrões vigentes (ativos agora)
   */
  async listarVigentes(filtros?: { categoria?: string; microrganismo?: string }) {
    const query: Record<string, any> = { ativo: true };
    
    if (filtros?.categoria) query.categoria = filtros.categoria;
    if (filtros?.microrganismo) query.microrganismo = filtros.microrganismo;

    const padroes = await Padrao.find(query)
      .sort({ categoria: 1, microrganismo: 1 })
      .lean();

    return padroes;
  }

  /**
   * Listar histórico de versões de um padrão
   */
  async listarHistorico(categoria: string, microrganismo: string) {
    const chaveComposta = `${categoria}|${microrganismo}`;

    const versoes = await Padrao.find({ chaveComposta })
      .sort({ vigemDe: -1 })
      .lean();

    return versoes;
  }

  /**
   * Obter padrão por ID
   */
  async obter(id: string) {
    const padrao = await Padrao.findById(id);
    if (!padrao) {
      throw new Error("Padrão não encontrado");
    }
    return padrao;
  }

  /**
   * Contar total de padrões únicos (categoria × microrganismo)
   */
  async contarUnicos(): Promise<number> {
    const resultado = await Padrao.aggregate([
      { $match: { ativo: true } },
      { $group: { _id: "$chaveComposta" } },
      { $count: "total" }
    ]);

    return resultado[0]?.total || 0;
  }
}

export const padroesService = new PadroesService();
