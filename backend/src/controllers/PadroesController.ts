import { Request, Response } from "express";
import { padroesService } from "../services/PadroesService";
import { CriarPadraoRequest, ApiResponse } from "../types/shared-types";

export class PadroesController {
  /**
   * POST /api/padroes
   * Criar novo padrão (com versionamento automático)
   */
  async criar(req: Request, res: Response) {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          sucesso: false,
          erro: "Não autenticado"
        });
      }

      const dados: CriarPadraoRequest = req.body;

      // Validações
      if (!dados.categoria || !dados.microrganismo || dados.limiteMinimo === undefined || !dados.limiteMaximo || !dados.unidade || !dados.criticidade || !dados.vigem) {
        return res.status(400).json({
          sucesso: false,
          erro: "Campos obrigatórios: categoria, microrganismo, limiteMinimo, limiteMaximo, unidade, criticidade, vigem"
        });
      }

      if (dados.limiteMinimo >= dados.limiteMaximo) {
        return res.status(400).json({
          sucesso: false,
          erro: "Limite mínimo deve ser menor que limite máximo"
        });
      }

      const padrao = await padroesService.criarPadrao(dados, req.usuario.email);

      res.status(201).json({
        sucesso: true,
        dados: padrao
      });
    } catch (error: any) {
      res.status(400).json({
        sucesso: false,
        erro: error.message
      });
    }
  }

  /**
   * GET /api/padroes
   * Listar padrões vigentes
   */
  async listarVigentes(req: Request, res: Response) {
    try {
      const filtros = {
        categoria: req.query.categoria as string | undefined,
        microrganismo: req.query.microrganismo as string | undefined
      };

      const padroes = await padroesService.listarVigentes(filtros);

      res.json({
        sucesso: true,
        dados: padroes
      });
    } catch (error: any) {
      res.status(400).json({
        sucesso: false,
        erro: error.message
      });
    }
  }

  /**
   * GET /api/padroes/:id
   * Obter padrão por ID
   */
  async obter(req: Request, res: Response) {
    try {
      const padrao = await padroesService.obter(req.params.id);

      res.json({
        sucesso: true,
        dados: padrao
      });
    } catch (error: any) {
      res.status(404).json({
        sucesso: false,
        erro: error.message
      });
    }
  }

  /**
   * GET /api/padroes/historico/:categoria/:microrganismo
   * Ver histórico de versões
   */
  async listarHistorico(req: Request, res: Response) {
    try {
      const { categoria, microrganismo } = req.params;
      const versoes = await padroesService.listarHistorico(categoria, microrganismo);

      res.json({
        sucesso: true,
        dados: versoes
      });
    } catch (error: any) {
      res.status(400).json({
        sucesso: false,
        erro: error.message
      });
    }
  }

  /**
   * GET /api/padroes/contagem/unicos
   * Contar padrões únicos (categoria × microrganismo)
   */
  async contarUnicos(req: Request, res: Response) {
    try {
      const total = await padroesService.contarUnicos();

      res.json({
        sucesso: true,
        dados: { totalUnicos: total }
      });
    } catch (error: any) {
      res.status(400).json({
        sucesso: false,
        erro: error.message
      });
    }
  }
}

export const padroesController = new PadroesController();
