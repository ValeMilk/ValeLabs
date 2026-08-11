import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/valelabs";
const JWT_SECRET = process.env.JWT_SECRET || "sua-chave-secreta-aqui";

// ========== MIDDLEWARE ==========
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

// ========== DATABASE & MODELS ==========
async function conectarMongoDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: "valelabs_microbio"
    } as any);
    console.log("✅ Conectado ao MongoDB");
  } catch (erro) {
    console.error("❌ Erro ao conectar MongoDB:", erro);
    process.exit(1);
  }
}

// Schemas simples
const usuarioSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  senha: { type: String, required: true },
  perfis: { type: [String], default: ["analista"] },
  ativo: { type: Boolean, default: true },
  criadoEm: { type: Date, default: Date.now }
});

const produtoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: { type: String, default: "" },
  categoria: { type: String, required: true },
  ativo: { type: Boolean, default: true },
  criadoEm: { type: Date, default: Date.now }
});

const padraoSchema = new mongoose.Schema({
  categoria: { type: String, required: true },
  microrganismo: { type: String, required: true },
  limiteMinimo: { type: Number, required: true },
  limiteMaximo: { type: Number, required: true },
  unidade: { type: String, default: "UFC/mL" },
  criticidade: { type: String, enum: ["CRÍTICO", "ATENÇÃO", "CONFORME"], required: true },
  vigem: { type: Date, required: true },
  proximaDataVigem: { type: Date, default: null },
  ativo: { type: Boolean, default: true },
  criadoEm: { type: Date, default: Date.now }
});

const analiseSchema = new mongoose.Schema({
  dataInoculacao: { type: Date, required: true },
  dataPrevistaLeitura: { type: Date, required: true },
  dataRealLeitura: { type: Date, default: null },
  produtoId: { type: String, required: true },
  categoria: { type: String, required: true },
  pontoColeta: { type: String, default: "" },
  microrganismo: { type: String, required: true },
  resultado: { type: mongoose.Schema.Types.Mixed, default: null },
  statusCiclo: { type: String, enum: ["inoculada", "aguardando_leitura", "lida"], default: "inoculada" },
  statusConformidade: { type: String, enum: ["APROVADO", "REPROVADO", "PENDENTE", "SEM_PADRÃO"], default: "PENDENTE" },
  padraoVigenteId: { type: String, default: null },
  padraoVigenteSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  criadoPor: { type: String, required: true },
  criadoEm: { type: Date, default: Date.now }
});

const Usuario = mongoose.model("Usuario", usuarioSchema);
const Produto = mongoose.model("Produto", produtoSchema);
const Padrao = mongoose.model("Padrao", padraoSchema);
const Analise = mongoose.model("Analise", analiseSchema);

// ========== MIDDLEWARE AUTENTICAÇÃO ==========
function autenticar(req: any, res: any, next: any) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ sucesso: false, mensagem: "Token não fornecido" });
    }
    const token = header.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.usuario = { id: decoded.id, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ sucesso: false, mensagem: "Token inválido" });
  }
}

// ========== ROUTES ==========

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// AUTH
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ sucesso: false, mensagem: "Email e senha são obrigatórios" });
    }
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(401).json({ sucesso: false, mensagem: "Email ou senha incorretos" });
    }
    const senhaValida = await bcryptjs.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ sucesso: false, mensagem: "Email ou senha incorretos" });
    }
    const token = jwt.sign({ id: usuario._id, email: usuario.email }, JWT_SECRET, { expiresIn: "24h" });
    res.json({
      sucesso: true,
      mensagem: "Login realizado",
      dados: {
        token,
        usuario: { _id: usuario._id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfis }
      }
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

app.post("/api/auth/seed", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ sucesso: false, mensagem: "Não permitido em produção" });
    }
    await Usuario.deleteOne({ email: "teste@valelabs.com" });
    const senhaHash = await bcryptjs.hash("Teste@123", 10);
    const usuario = new Usuario({
      email: "teste@valelabs.com",
      nome: "Usuário Teste",
      senha: senhaHash,
      perfis: ["analista"]
    });
    await usuario.save();
    res.status(201).json({
      sucesso: true,
      mensagem: "Usuário de teste criado",
      dados: { email: "teste@valelabs.com", senha: "Teste@123" }
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

app.get("/api/auth/me", autenticar, async (req, res) => {
  try {
    const usuarioId = (req as any).usuario?.id;
    if (!usuarioId) {
      return res.status(401).json({ sucesso: false, mensagem: "Não autenticado" });
    }
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ sucesso: false, mensagem: "Usuário não encontrado" });
    }
    res.json({
      sucesso: true,
      mensagem: "Usuário encontrado",
      dados: { _id: usuario._id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfis }
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// DASHBOARD
app.get("/api/dashboard/categorias", autenticar, async (req, res) => {
  try {
    const analises = await Analise.find({});
    const categorias = new Map();

    for (const analise of analises) {
      const cat = analise.categoria || "Sem Categoria";
      if (!categorias.has(cat)) {
        categorias.set(cat, {
          categoria: cat,
          totalAnalises: 0,
          aprovadas: 0,
          reprovadas: 0,
          pendentes: 0,
          criticidade: "CONFORME"
        });
      }
      const stats = categorias.get(cat);
      stats.totalAnalises++;
      if (analise.statusConformidade === "APROVADO") {
        stats.aprovadas++;
      } else if (analise.statusConformidade === "REPROVADO") {
        stats.reprovadas++;
        stats.criticidade = "CRÍTICO";
      } else if (analise.statusConformidade === "PENDENTE") {
        stats.pendentes++;
        if (stats.criticidade !== "CRÍTICO") stats.criticidade = "ATENÇÃO";
      }
    }

    res.json({
      sucesso: true,
      mensagem: "Categorias carregadas",
      dados: Array.from(categorias.values())
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// ========== ERROR HANDLER ==========
app.use((err: any, req: any, res: any) => {
  console.error("Erro:", err);
  res.status(500).json({ sucesso: false, mensagem: err.message || "Erro interno" });
});

// ========== START SERVER ==========
async function start() {
  try {
    await conectarMongoDB();
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📝 Health: http://localhost:${PORT}/api/health`);
    });
  } catch (erro) {
    console.error("Erro ao iniciar:", erro);
    process.exit(1);
  }
}

start();
    });
  } catch (error) {
    console.error("Falha ao iniciar:", error);
    process.exit(1);
  }
}

start();

export default app;
