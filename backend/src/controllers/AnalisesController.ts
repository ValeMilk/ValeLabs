import { Request, Response } from "express";
import { analisesService } from "../services/AnalisesService";
import { CriarAnaliseRequest, AtualizarAnaliseRequest, ApiResponse, PaginatedResponse } from "../types/shared-types";

// Estender Request para incluir usuário autenticado
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        email: string;
        nome: string;
      };
    }
  }
}

export class AnalisesController {
  /**
   * POST /api/analises
   * Criar nova análise
   */
  async criar(req: Request, res: Response) {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          sucesso: false,
          erro: "Não autenticado"
        });
      }

      const dados: CriarAnaliseRequest = req.body;

      // Validações básicas
      if (!dados.dataInoculacao || !dados.produtoId || !dados.categoria || !dados.microrganismo) {
        return res.status(400).json({
          sucesso: false,
          erro: "Campos obrigatórios: dataInoculacao, produtoId, categoria, microrganismo, dataPrevistaLeitura"
        });
      }

      const analise = await analisesService.criarAnalise(
        dados,
        req.usuario.email,
        req.usuario.nome
      );

      res.status(201).json({
        sucesso: true,
        dados: analise
      } as ApiResponse<typeof analise>);
    } catch (error: any) {
      res.status(400).json({
        sucesso: false,
        erro: error.message
      });
    }
  }

  /**
   * GET /api/analises
   * Listar análises com filtros e paginação
   */
  async listar(req: Request, res: Response) {
    try {
      const filtros = {
        categoria: req.query.categoria as string | undefined,
        microrganismo: req.query.microrganismo as string | undefined,
        produtoId: req.query.produtoId as string | undefined,
        statusConformidade: req.query.statusConformidade as string | undefined,
        statusCiclo: req.query.statusCiclo as string | undefined,
        dataInicio: req.query.dataInicio ? new Date(req.query.dataInicio as string) : undefined,
        dataFim: req.query.dataFim ? new Date(req.query.dataFim as string) : undefined,
        pagina: req.query.pagina ? parseInt(req.query.pagina as string) : 1,
        limite: req.query.limite ? parseInt(req.query.limite as string) : 20
      };

      const resultado = await analisesService.listarAnalises(filtros);

      res.json(resultado as any);
    } catch (error: any) {
      res.status(400).json({
        sucesso: false,
        erro: error.message
      });
    }
  }

  /**
   * GET /api/analises/:id
   * Obter detalhe com auditoria
   */
  async obter(req: Request, res: Response) {
    try {
      const resultado = await analisesService.obterAnaliseComAuditoria(req.params.id);

      res.json({
        sucesso: true,
        dados: resultado
      });
    } catch (error: any) {
      res.status(404).json({
        sucesso: false,
        erro: error.message
      });
    }
  }

  /**
   * PATCH /api/analises/:id
   * Atualizar resultado e/ou datas
   */
  async atualizar(req: Request, res: Response) {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          sucesso: false,
          erro: "Não autenticado"
        });
      }

      const dados: AtualizarAnaliseRequest = req.body;

      // Validações básicas
      if (!dados.dataRealLeitura && dados.resultado === undefined) {
        return res.status(400).json({
          sucesso: false,
          erro: "Informe pelo menos dataRealLeitura ou resultado"
        });
      }

      const analise = await analisesService.atualizarAnalise(
        req.params.id,
        dados,
        req.usuario.email,
        req.usuario.nome
      );

      res.json({
        sucesso: true,
        dados: analise
      });
    } catch (error: any) {
      res.status(400).json({
        sucesso: false,
        erro: error.message
      });
    }
  }

  /**
   * GET /api/analises/pendentes/listar
   * Listar análises com atraso de leitura
   */
  async listarPendentes(req: Request, res: Response) {
    try {
      const diasTolera = req.query.diasTolera ? parseInt(req.query.diasTolera as string) : 2;
      const pendentes = await analisesService.listarPendentes(diasTolera);

      res.json({
        sucesso: true,
        dados: pendentes
      });
    } catch (error: any) {
      res.status(400).json({
        sucesso: false,
        erro: error.message
      });
    }
  }

  /**
   * POST /api/analises/auditoria/datas-suspeitas
   * Marcar análises muito antigas como suspeitas para revisão
   */
  async auditarDatas(req: Request, res: Response) {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          sucesso: false,
          erro: "Não autenticado"
        });
      }

      const qtd = await analisesService.auditarDatassSuspeitas();

      res.json({
        sucesso: true,
        dados: { quantidadeMarcada: qtd }
      });
    } catch (error: any) {
      res.status(400).json({
        sucesso: false,
        erro: error.message
      });
    }
  }
}

export const analisesController = new AnalisesController();
