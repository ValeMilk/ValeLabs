import {
  calcularStatusCiclo,
  calcularStatusConformidade,
  StatusConformidade,
  StatusCicloAnalise,
  CriarAnaliseRequest,
  AtualizarAnaliseRequest
} from "../types/shared-types";
import { Analise, IAnaliseDocument } from "../models/Analise";
import { Padrao } from "../models/Padrao";
import { AuditoriaLog } from "../models/AuditoriaLog";
import { Produto } from "../models/Produto";

export class AnalisesService {
  /**
   * Busca padrão vigente para uma categoria × microrganismo em determinada data
   * Segue a regra: amarrar resultado ao padrão da época da inoculação
   */
  async buscarPadraoVigente(
    categoria: string,
    microrganismo: string,
    dataInoculacao: Date
  ) {
    const chaveComposta = `${categoria}|${microrganismo}`;
    
    const padrao = await Padrao.findOne({
      chaveComposta,
      vigemDe: { $lte: dataInoculacao },
      $or: [
        { vigemAte: null },
        { vigemAte: { $gt: dataInoculacao } }
      ],
      ativo: true
    });
    
    return padrao;
  }

  /**
   * Criar nova análise
   * O status é SEMPRE calculado automaticamente, nunca digitado pelo usuário
   */
  async criarAnalise(
    data: CriarAnaliseRequest,
    usuarioId: string,
    usuarioNome: string
  ): Promise<IAnaliseDocument> {
    // 1. Validar que produto existe
    const produto = await Produto.findById(data.produtoId);
    if (!produto) {
      throw new Error("Produto não encontrado");
    }

    // 2. Buscar padrão vigente na data de inoculação
    const dataInoculacao = new Date(data.dataInoculacao);
    const padrao = await this.buscarPadraoVigente(
      data.categoria,
      data.microrganismo,
      dataInoculacao
    );

    // 3. Criar documento
    const novaAnalise = new Analise({
      dataInoculacao,
      dataPrevistaLeitura: new Date(data.dataPrevistaLeitura),
      dataRealLeitura: null,
      
      produtoId: data.produtoId,
      categoria: data.categoria,
      pontoColeta: data.pontoColeta,
      microrganismo: data.microrganismo,
      
      resultado: null,
      
      // Status CALCULADOS (não digitados)
      statusCiclo: StatusCicloAnalise.INOCULADA,
      statusConformidade: StatusConformidade.PENDENTE,
      
      // Snapshots do padrão
      padraoVigenteId: padrao?._id || null,
      padraoVigenteSnapshot: padrao ? {
        limiteIdeal: padrao.limiteIdeal,
        limiteMaximo: padrao.limiteMaximo,
        vigemDe: padrao.vigemDe
      } : null,
      
      // Auditoria
      criadoPor: usuarioId,
      criadoEm: new Date(),
      
      // Flags
      motivo: data.motivo || undefined
    });

    // 4. Salvar (middleware pre-save recalcula status)
    await novaAnalise.save();

    // 5. Registrar auditoria
    await AuditoriaLog.create({
      analiseId: novaAnalise._id,
      usuarioId,
      usuarioNome,
      timestamp: new Date(),
      acao: "criar",
      camposAlterados: {
        dataInoculacao: { antes: null, depois: novaAnalise.dataInoculacao },
        categoria: { antes: null, depois: novaAnalise.categoria },
        microrganismo: { antes: null, depois: novaAnalise.microrganismo },
        statusConformidade: { antes: null, depois: novaAnalise.statusConformidade },
        statusCiclo: { antes: null, depois: novaAnalise.statusCiclo }
      }
    });

    return novaAnalise;
  }

  /**
   * Atualizar análise (resultado e/ou datas)
   * Status é recalculado automaticamente
   */
  async atualizarAnalise(
    id: string,
    data: AtualizarAnaliseRequest,
    usuarioId: string,
    usuarioNome: string
  ): Promise<IAnaliseDocument> {
    const analise = await Analise.findById(id);
    if (!analise) {
      throw new Error("Análise não encontrada");
    }

    // Guardar valores antigos para auditoria
    const valoresAntigos = {
      dataRealLeitura: analise.dataRealLeitura,
      resultado: analise.resultado,
      statusConformidade: analise.statusConformidade,
      statusCiclo: analise.statusCiclo
    };

    // Atualizar campos fornecidos
    if (data.dataRealLeitura) {
      analise.dataRealLeitura = new Date(data.dataRealLeitura);
    }
    if (data.resultado !== undefined) {
      analise.resultado = data.resultado;
    }

    // Salvar (middleware pre-save recalcula status automaticamente)
    await analise.save();

    // Registrar auditoria (apenas campos que mudaram)
    const camposAlterados: Record<string, any> = {};
    
    if (data.dataRealLeitura && valoresAntigos.dataRealLeitura !== analise.dataRealLeitura) {
      camposAlterados.dataRealLeitura = {
        antes: valoresAntigos.dataRealLeitura,
        depois: analise.dataRealLeitura
      };
    }
    
    if (data.resultado !== undefined && valoresAntigos.resultado !== analise.resultado) {
      camposAlterados.resultado = {
        antes: valoresAntigos.resultado,
        depois: analise.resultado
      };
    }
    
    if (valoresAntigos.statusConformidade !== analise.statusConformidade) {
      camposAlterados.statusConformidade = {
        antes: valoresAntigos.statusConformidade,
        depois: analise.statusConformidade
      };
    }
    
    if (valoresAntigos.statusCiclo !== analise.statusCiclo) {
      camposAlterados.statusCiclo = {
        antes: valoresAntigos.statusCiclo,
        depois: analise.statusCiclo
      };
    }

    if (Object.keys(camposAlterados).length > 0) {
      await AuditoriaLog.create({
        analiseId: analise._id,
        usuarioId,
        usuarioNome,
        timestamp: new Date(),
        acao: "editar",
        camposAlterados,
        motivoAlteracao: data.motivo || undefined
      });
    }

    return analise;
  }

  /**
   * Listar análises com filtros e paginação
   */
  async listarAnalises(filtros: {
    categoria?: string;
    microrganismo?: string;
    produtoId?: string;
    statusConformidade?: string;
    statusCiclo?: string;
    dataInicio?: Date;
    dataFim?: Date;
    pagina?: number;
    limite?: number;
  }) {
    const pagina = filtros.pagina || 1;
    const limite = Math.min(filtros.limite || 20, 100); // Max 100 por página
    const skip = (pagina - 1) * limite;

    // Construir query
    const query: Record<string, any> = {};
    
    if (filtros.categoria) query.categoria = filtros.categoria;
    if (filtros.microrganismo) query.microrganismo = filtros.microrganismo;
    if (filtros.produtoId) query.produtoId = filtros.produtoId;
    if (filtros.statusConformidade) query.statusConformidade = filtros.statusConformidade;
    if (filtros.statusCiclo) query.statusCiclo = filtros.statusCiclo;
    
    if (filtros.dataInicio || filtros.dataFim) {
      query.dataInoculacao = {};
      if (filtros.dataInicio) query.dataInoculacao.$gte = filtros.dataInicio;
      if (filtros.dataFim) query.dataInoculacao.$lte = filtros.dataFim;
    }

    // Executar query
    const [analises, total] = await Promise.all([
      Analise.find(query)
        .sort({ dataInoculacao: -1 })
        .skip(skip)
        .limit(limite)
        .lean(),
      Analise.countDocuments(query)
    ]);

    return {
      sucesso: true,
      dados: analises,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite)
    };
  }

  /**
   * Obter detalhe + auditoria de uma análise
   */
  async obterAnaliseComAuditoria(id: string) {
    const [analise, auditoria] = await Promise.all([
      Analise.findById(id).lean(),
      AuditoriaLog.find({ analiseId: id }).sort({ timestamp: -1 }).lean()
    ]);

    if (!analise) {
      throw new Error("Análise não encontrada");
    }

    return {
      analise,
      auditoria
    };
  }

  /**
   * Listar análises pendentes (não lidas após data prevista)
   */
  async listarPendentes(diasTolera: number = 2) {
    const hoje = new Date();
    const dataLimite = new Date(hoje);
    dataLimite.setDate(dataLimite.getDate() - diasTolera);

    const pendentes = await Analise.find({
      statusCiclo: StatusCicloAnalise.AGUARDANDO_LEITURA,
      dataPrevistaLeitura: { $lt: dataLimite }
    })
      .sort({ dataPrevistaLeitura: 1 })
      .lean();

    return pendentes;
  }

  /**
   * Marcar para auditoria de datas suspeitas
   */
  async auditarDatassSuspeitas() {
    const hoje = new Date();
    const umAnoAtras = new Date(hoje);
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

    // Análises muito antigas ainda PENDENTE
    const suspeitas = await Analise.find({
      statusCiclo: StatusCicloAnalise.AGUARDANDO_LEITURA,
      dataInoculacao: { $lt: umAnoAtras }
    });

    await Promise.all(
      suspeitas.map(analise =>
        analise.updateOne({ dataAuditar: true })
      )
    );

    return suspeitas.length;
  }
}

export const analisesService = new AnalisesService();
