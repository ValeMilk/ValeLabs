import { Router, Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { Usuario } from "../models";

const router = Router();

/**
 * POST /api/auth/seed
 * Criar usuários de teste (apenas em desenvolvimento)
 */
router.post("/seed", async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        sucesso: false,
        erro: "Não permitido em produção"
      });
    }

    // Deletar se já existe
    await Usuario.deleteOne({ email: "teste@valelabs.com" });

    // Hash da senha
    const senhaHash = await bcryptjs.hash("Teste@123", 10);

    // Criar usuário
    const usuario = new Usuario({
      email: "teste@valelabs.com",
      senha: senhaHash,
      nome: "Usuário Teste",
      perfis: ["analista"]
    });

    await usuario.save();

    return res.status(201).json({
      sucesso: true,
      mensagem: "Usuário de teste criado",
      dados: {
        email: "teste@valelabs.com",
        senha: "Teste@123"
      }
    });
  } catch (erro: any) {
    return res.status(500).json({
      sucesso: false,
      erro: erro.message
    });
  }
});

export default router;
