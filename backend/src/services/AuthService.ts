import jwt from "jsonwebtoken";
import { Usuario } from "../models/Usuario";

const JWT_SECRET = process.env.JWT_SECRET || "sua-chave-secreta-super-segura";

export class AuthService {
  /**
   * Gerar JWT
   */
  gerarToken(usuarioId: string, email: string): string {
    return jwt.sign(
      {
        sub: usuarioId,
        email
      },
      JWT_SECRET,
      {
        expiresIn: "24h"
      }
    );
  }

  /**
   * Validar JWT
   */
  validarToken(token: string): { sub: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        sub: decoded.sub,
        email: decoded.email
      };
    } catch {
      return null;
    }
  }

  /**
   * Login (simples, sem senha hash por agora)
   */
  async login(email: string, senha: string) {
    // Por enquanto, permitir qualquer usuário com email válido
    // Em produção, validar contra banco de dados com bcrypt
    
    if (!email || !senha) {
      throw new Error("Email e senha são obrigatórios");
    }

    // Buscar ou criar usuário (para demo)
    let usuario = await Usuario.findOne({ email });
    
    if (!usuario) {
      // Criar usuário demo
      usuario = new Usuario({
        email,
        nome: email.split("@")[0],
        perfis: ["Analista"],
        ativo: true
      });
      await usuario.save();
    }

    if (!usuario.ativo) {
      throw new Error("Usuário inativo");
    }

    const token = this.gerarToken(usuario._id.toString(), usuario.email);

    return {
      token,
      usuario: {
        _id: usuario._id,
        email: usuario.email,
        nome: usuario.nome,
        perfis: usuario.perfis
      }
    };
  }

  /**
   * Validar token e retornar dados do usuário
   */
  async validarSessao(token: string) {
    const decoded = this.validarToken(token);
    if (!decoded) {
      throw new Error("Token inválido");
    }

    const usuario = await Usuario.findById(decoded.sub);
    if (!usuario || !usuario.ativo) {
      throw new Error("Usuário não encontrado ou inativo");
    }

    return {
      _id: usuario._id,
      email: usuario.email,
      nome: usuario.nome,
      perfis: usuario.perfis
    };
  }
}
