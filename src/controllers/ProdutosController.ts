import { Request, Response } from "express";
import { ProdutosService } from "../services/ProdutosService";

const produtosService = new ProdutosService();

export class ProdutosController {
  /**
   * GET /api/produtos
   */
  async listar(req: Request, res: Response) {
    try {
      const { categoria, comContagem } = req.query;

      const filtros = {
        categoria: categoria as string | undefined,
        ativo: true
      };

      let resultado;
      if (comContagem === "true") {
        resultado = await produtosService.listarComContagem();
      } else {
        resultado = await produtosService.listarTodos(filtros);
      }

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
   * GET /api/produtos/:id
   */
  async obter(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const produto = await produtosService.obter(id);

      return res.status(200).json({
        sucesso: true,
        dados: produto
      });
    } catch (erro: any) {
      return res.status(404).json({
        sucesso: false,
        erro: erro.message
      });
    }
  }

  /**
   * POST /api/produtos
   */
  async criar(req: Request, res: Response) {
    try {
      const { nome, categoria, descricao } = req.body;

      if (!nome || !categoria) {
        return res.status(400).json({
          sucesso: false,
          erro: "Nome e categoria são obrigatórios"
        });
      }

      const produto = await produtosService.criar({ nome, categoria, descricao });

      return res.status(201).json({
        sucesso: true,
        dados: produto
      });
    } catch (erro: any) {
      return res.status(400).json({
        sucesso: false,
        erro: erro.message
      });
    }
  }
}
