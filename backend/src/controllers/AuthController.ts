import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";

const authService = new AuthService();

export class AuthController {
  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({
          sucesso: false,
          erro: "Email e senha são obrigatórios"
        });
      }

      const { token, usuario } = await authService.login(email, senha);

      return res.status(200).json({
        sucesso: true,
        dados: {
          token,
          usuario
        }
      });
    } catch (erro: any) {
      return res.status(401).json({
        sucesso: false,
        erro: erro.message
      });
    }
  }

  /**
   * GET /api/auth/me
   */
  async me(req: Request, res: Response) {
    try {
      // Token já foi validado pelo middleware autenticarJWT
      const usuarioId = (req as any).usuario?.id;
      
      if (!usuarioId) {
        return res.status(401).json({
          sucesso: false,
          erro: "Não autenticado"
        });
      }

      // Buscar dados atualizados do usuário
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({
          sucesso: false,
          erro: "Token não fornecido"
        });
      }

      const usuario = await authService.validarSessao(token);

      return res.status(200).json({
        sucesso: true,
        dados: usuario
      });
    } catch (erro: any) {
      return res.status(401).json({
        sucesso: false,
        erro: erro.message
      });
    }
  }
}
