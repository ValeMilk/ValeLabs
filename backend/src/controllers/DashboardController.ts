import { Request, Response } from "express";
import { DashboardService } from "../services/DashboardService";

const dashboardService = new DashboardService();

export class DashboardController {
  /**
   * GET /api/dashboard/categorias
   */
  async obterCategorias(req: Request, res: Response) {
    try {
      const resultado = await dashboardService.obterPorCategoria();

      return res.status(200).json({
        sucesso: true,
        dados: resultado
      });
    } catch (erro: any) {
      return res.status(500).json({
        sucesso: false,
        erro: erro.message
      });
    }
  }

  /**
   * GET /api/dashboard/categoria/:categoria
   */
  async obterCategoria(req: Request, res: Response) {
    try {
      const { categoria } = req.params;

      const analises = await dashboardService.obterPorCategoriaDetalhado(categoria);

      return res.status(200).json({
        sucesso: true,
        dados: analises
      });
    } catch (erro: any) {
      return res.status(500).json({
        sucesso: false,
        erro: erro.message
      });
    }
  }

  /**
   * GET /api/dashboard/produto/:produtoId
   */
  async obterProduto(req: Request, res: Response) {
    try {
      const { produtoId } = req.params;

      const analises = await dashboardService.obterPorProduto(produtoId);

      return res.status(200).json({
        sucesso: true,
        dados: analises
      });
    } catch (erro: any) {
      return res.status(500).json({
        sucesso: false,
        erro: erro.message
      });
    }
  }

  /**
   * GET /api/dashboard/tendencia/categoria/:categoria
   */
  async obterTendenciaCategoria(req: Request, res: Response) {
    try {
      const { categoria } = req.params;
      const { dataInicio, dataFim, periodo = "dia" } = req.query;

      if (!dataInicio || !dataFim) {
        return res.status(400).json({
          sucesso: false,
          erro: "dataInicio e dataFim são obrigatórios"
        });
      }

      const inicio = new Date(dataInicio as string);
      const fim = new Date(dataFim as string);

      const resultado = await dashboardService.obterTendenciaCategoria(
        categoria,
        inicio,
        fim,
        (periodo as any) || "dia"
      );

      return res.status(200).json({
        sucesso: true,
        dados: resultado
      });
    } catch (erro: any) {
      return res.status(500).json({
        sucesso: false,
        erro: erro.message
      });
    }
  }
}
