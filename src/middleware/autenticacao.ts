import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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

export function autenticarJWT(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: "Token não fornecido"
    });
  }

  try {
    const decodificado = jwt.verify(token, process.env.JWT_SECRET || "secret");
    
    req.usuario = decodificado as any;
    next();
  } catch (error) {
    res.status(401).json({
      sucesso: false,
      erro: "Token inválido ou expirado"
    });
  }
}

export function opcionalJWT(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      const decodificado = jwt.verify(token, process.env.JWT_SECRET || "secret");
      req.usuario = decodificado as any;
    } catch (error) {
      // Token inválido, mas continua sem usuário
    }
  }

  next();
}
