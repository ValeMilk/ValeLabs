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
  nome: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  perfil: { type: String, enum: ["Admin", "Diretora", "Supervisora Qualidade", "Qualidade"], default: "Qualidade" },
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

const microrganismoSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
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

const auditoriaPadraoSchema = new mongoose.Schema({
  padraoId: { type: mongoose.Schema.Types.ObjectId, ref: "Padrao", required: true, index: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true, index: true },
  usuarioNome: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: -1 },
  acao: { type: String, enum: ["criar", "editar", "deletar"], required: true },
  dados: {
    categoria: String,
    microrganismo: String,
    limiteMinimo: Number,
    limiteMaximo: Number,
    unidade: String,
    criticidade: String,
    vigem: Date
  },
  dadosAnigos: mongoose.Schema.Types.Mixed,
  descricao: String
});

const Usuario = mongoose.model("Usuario", usuarioSchema);
const Produto = mongoose.model("Produto", produtoSchema);
const Padrao = mongoose.model("Padrao", padraoSchema);
const Microrganismo = mongoose.model("Microrganismo", microrganismoSchema);
const Analise = mongoose.model("Analise", analiseSchema);
const AuditoriaPadrao = mongoose.model("AuditoriaPadrao", auditoriaPadraoSchema);

// ========== MIDDLEWARE AUTENTICAÇÃO & AUTORIZAÇÃO ==========
function autenticar(req: any, res: any, next: any) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ sucesso: false, mensagem: "Token não fornecido" });
    }
    const token = header.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.usuario = { id: decoded.id, nome: decoded.nome, perfil: decoded.perfil };
    next();
  } catch {
    return res.status(401).json({ sucesso: false, mensagem: "Token inválido" });
  }
}

function autorizarAdmin(req: any, res: any, next: any) {
  if (!req.usuario) {
    return res.status(401).json({ sucesso: false, mensagem: "Não autenticado" });
  }
  if (req.usuario.perfil !== "Admin") {
    return res.status(403).json({ sucesso: false, mensagem: "Apenas Admin pode acessar" });
  }
  next();
}

function autorizarQualidade(req: any, res: any, next: any) {
  if (!req.usuario) {
    return res.status(401).json({ sucesso: false, mensagem: "Não autenticado" });
  }
  const perfisAutorizados = ["Admin", "Diretora", "Supervisora Qualidade"];
  if (!perfisAutorizados.includes(req.usuario.perfil)) {
    return res.status(403).json({ sucesso: false, mensagem: "Acesso restrito. Apenas Admin, Diretora e Supervisora Qualidade podem acessar" });
  }
  next();
}

// ========== AUDITORIA ==========
async function registrarAuditoriaPadrao(
  padraoId: string,
  usuarioId: string,
  usuarioNome: string,
  acao: "criar" | "editar" | "deletar",
  dados: any,
  dadosAntigos?: any,
  descricao?: string
) {
  try {
    const auditoria = new AuditoriaPadrao({
      padraoId,
      usuarioId,
      usuarioNome,
      acao,
      dados,
      dadosAnigos: dadosAntigos,
      descricao
    });
    await auditoria.save();
  } catch (erro) {
    console.error("Erro ao registrar auditoria:", erro);
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
    const { nome, senha } = req.body;
    if (!nome || !senha) {
      return res.status(400).json({ sucesso: false, mensagem: "Nome e senha são obrigatórios" });
    }
    const usuario = await Usuario.findOne({ nome });
    if (!usuario) {
      return res.status(401).json({ sucesso: false, mensagem: "Usuário ou senha incorretos" });
    }
    const senhaValida = await bcryptjs.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ sucesso: false, mensagem: "Usuário ou senha incorretos" });
    }
    const token = jwt.sign({ id: usuario._id, nome: usuario.nome, perfil: usuario.perfil }, JWT_SECRET, { expiresIn: "24h" });
    res.json({
      sucesso: true,
      mensagem: "Login realizado",
      dados: {
        token,
        usuario: { _id: usuario._id, nome: usuario.nome, perfil: usuario.perfil }
      }
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// Listar usuários para dropdown (sem autenticação)
app.get("/api/auth/usuarios", async (req, res) => {
  try {
    const usuarios = await Usuario.find({ ativo: true }).select("_id nome perfil").sort("nome");
    res.json({
      sucesso: true,
      mensagem: "Usuários carregados",
      dados: usuarios
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

app.post("/api/auth/seed", async (req, res) => {
  try {
    // Permitir seed apenas em ambiente de desenvolvimento
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
    if (!isDev) {
      return res.status(403).json({ sucesso: false, mensagem: "Não permitido em produção" });
    }
    // Droppar collection pra remover índices antigos
    await Usuario.collection.drop().catch(() => {});
    
    // Criar usuários de teste com diferentes perfis
    const usuarios = [
      { nome: "Admin", perfil: "Admin", senha: "Admin@123" },
      { nome: "Diretora", perfil: "Diretora", senha: "Diretora@123" },
      { nome: "Supervisora Qualidade", perfil: "Supervisora Qualidade", senha: "Supervisora@123" },
      { nome: "Qualidade", perfil: "Qualidade", senha: "Qualidade@123" }
    ];
    
    const usuariosCriados = [];
    for (const u of usuarios) {
      const senhaHash = await bcryptjs.hash(u.senha, 10);
      const usuario = new Usuario({
        nome: u.nome,
        perfil: u.perfil,
        senha: senhaHash
      });
      await usuario.save();
      usuariosCriados.push({ nome: u.nome, perfil: u.perfil });
    }
    
    res.status(201).json({
      sucesso: true,
      mensagem: "Usuários de teste criados",
      dados: usuariosCriados
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// ========== ADMIN: CRUD USUÁRIOS ==========

// GET all usuários (admin only)
app.get("/api/admin/usuarios", autenticar, autorizarAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find().select("-senha").sort("nome");
    res.json({
      sucesso: true,
      mensagem: "Usuários carregados",
      dados: usuarios
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// POST criar usuário (admin only)
app.post("/api/admin/usuarios", autenticar, autorizarAdmin, async (req, res) => {
  try {
    const { nome, senha, perfil } = req.body;
    if (!nome || !senha || !perfil) {
      return res.status(400).json({ sucesso: false, mensagem: "Nome, senha e perfil são obrigatórios" });
    }
    const existe = await Usuario.findOne({ nome });
    if (existe) {
      return res.status(400).json({ sucesso: false, mensagem: "Usuário já existe" });
    }
    const senhaHash = await bcryptjs.hash(senha, 10);
    const usuario = new Usuario({ nome, senha: senhaHash, perfil, ativo: true });
    await usuario.save();
    res.status(201).json({
      sucesso: true,
      mensagem: "Usuário criado",
      dados: { _id: usuario._id, nome: usuario.nome, perfil: usuario.perfil, ativo: usuario.ativo }
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// PUT editar usuário (admin only)
app.put("/api/admin/usuarios/:id", autenticar, autorizarAdmin, async (req, res) => {
  try {
    const { nome, perfil, ativo, senha } = req.body;
    if (!nome && !perfil && ativo === undefined && !senha) {
      return res.status(400).json({ sucesso: false, mensagem: "Forneça pelo menos um campo para atualizar" });
    }
    
    const dadosAtualizacao: any = {};
    if (nome) dadosAtualizacao.nome = nome;
    if (perfil) dadosAtualizacao.perfil = perfil;
    if (ativo !== undefined) dadosAtualizacao.ativo = ativo;
    
    // Se senha foi fornecida, fazer hash e incluir
    if (senha && senha.trim()) {
      const senhaHash = await bcryptjs.hash(senha, 10);
      dadosAtualizacao.senha = senhaHash;
    }
    
    const usuario = await Usuario.findByIdAndUpdate(req.params.id, dadosAtualizacao, { new: true }).select("-senha");
    if (!usuario) {
      return res.status(404).json({ sucesso: false, mensagem: "Usuário não encontrado" });
    }
    res.json({
      sucesso: true,
      mensagem: "Usuário atualizado",
      dados: usuario
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// DELETE usuário (admin only)
app.delete("/api/admin/usuarios/:id", autenticar, autorizarAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    if (!usuario) {
      return res.status(404).json({ sucesso: false, mensagem: "Usuário não encontrado" });
    }
    res.json({
      sucesso: true,
      mensagem: "Usuário deletado",
      dados: { nome: usuario.nome }
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// POPULATE TEST DATA
app.post("/api/data/populate", async (req, res) => {
  try {
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
    if (!isDev) {
      return res.status(403).json({ sucesso: false, mensagem: "Não permitido em produção" });
    }

    // Limpar dados antigos
    await Produto.deleteMany({});
    await Padrao.deleteMany({});
    await Analise.deleteMany({});

    // Criar produtos de teste
    const produtos = await Produto.insertMany([
      { nome: "Leite Integral", categoria: "Leite", descricao: "Leite integral pasteurizado" },
      { nome: "Iogurte Natural", categoria: "Derivados", descricao: "Iogurte sem corantes" },
      { nome: "Queijo Meia Cura", categoria: "Queijos", descricao: "Queijo meia cura 500g" },
      { nome: "Leite Desnatado", categoria: "Leite", descricao: "Leite desnatado pasteurizado" }
    ]);

    // Criar padrões de teste
    const hoje = new Date();
    const proxima = new Date(hoje);
    proxima.setDate(proxima.getDate() + 30);
    const vigem = new Date(hoje);
    vigem.setDate(vigem.getDate() + 180);

    const padroes = await Padrao.insertMany([
      {
        categoria: "Leite",
        microrganismo: "Coliformes Totais",
        limiteMinimo: 0,
        limiteMaximo: 100,
        unidade: "UFC/mL",
        criticidade: "CRÍTICO",
        vigem,
        proximaDataVigem: proxima,
        ativo: true
      },
      {
        categoria: "Leite",
        microrganismo: "E. coli",
        limiteMinimo: 0,
        limiteMaximo: 10,
        unidade: "UFC/mL",
        criticidade: "CRÍTICO",
        vigem,
        proximaDataVigem: proxima,
        ativo: true
      },
      {
        categoria: "Derivados",
        microrganismo: "Bactérias Lácticas",
        limiteMinimo: 1000000,
        limiteMaximo: 50000000,
        unidade: "UFC/mL",
        criticidade: "CONFORME",
        vigem,
        proximaDataVigem: proxima,
        ativo: true
      },
      {
        categoria: "Queijos",
        microrganismo: "Staphylococcus aureus",
        limiteMinimo: 0,
        limiteMaximo: 1000,
        unidade: "UFC/g",
        criticidade: "CRÍTICO",
        vigem,
        proximaDataVigem: proxima,
        ativo: true
      }
    ]);

    // Criar análises de teste
    const usuario = await Usuario.findOne({ nome: "Admin" });
    const criadoPor = usuario ? usuario._id.toString() : "sistema";

    const datas = [];
    for (let i = 0; i < 12; i++) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      datas.push(data);
    }

    const analises = [
      // Leite - Coliformes
      { dataInoculacao: datas[0], dataPrevistaLeitura: datas[0], dataRealLeitura: datas[0], produtoId: produtos[0]._id, categoria: "Leite", microrganismo: "Coliformes Totais", statusCiclo: "lida", statusConformidade: "APROVADO", resultado: 50, criadoPor },
      { dataInoculacao: datas[1], dataPrevistaLeitura: datas[1], dataRealLeitura: datas[1], produtoId: produtos[0]._id, categoria: "Leite", microrganismo: "Coliformes Totais", statusCiclo: "lida", statusConformidade: "APROVADO", resultado: 75, criadoPor },
      { dataInoculacao: datas[2], dataPrevistaLeitura: datas[2], dataRealLeitura: datas[2], produtoId: produtos[0]._id, categoria: "Leite", microrganismo: "Coliformes Totais", statusCiclo: "lida", statusConformidade: "REPROVADO", resultado: 250, criadoPor },
      { dataInoculacao: datas[3], dataPrevistaLeitura: datas[3], dataRealLeitura: null, produtoId: produtos[3]._id, categoria: "Leite", microrganismo: "Coliformes Totais", statusCiclo: "aguardando_leitura", statusConformidade: "PENDENTE", resultado: null, criadoPor },
      
      // Derivados - Bactérias Lácticas
      { dataInoculacao: datas[1], dataPrevistaLeitura: datas[1], dataRealLeitura: datas[1], produtoId: produtos[1]._id, categoria: "Derivados", microrganismo: "Bactérias Lácticas", statusCiclo: "lida", statusConformidade: "APROVADO", resultado: 10000000, criadoPor },
      { dataInoculacao: datas[2], dataPrevistaLeitura: datas[2], dataRealLeitura: datas[2], produtoId: produtos[1]._id, categoria: "Derivados", microrganismo: "Bactérias Lácticas", statusCiclo: "lida", statusConformidade: "APROVADO", resultado: 15000000, criadoPor },
      { dataInoculacao: datas[3], dataPrevistaLeitura: datas[3], dataRealLeitura: null, produtoId: produtos[1]._id, categoria: "Derivados", microrganismo: "Bactérias Lácticas", statusCiclo: "aguardando_leitura", statusConformidade: "PENDENTE", resultado: null, criadoPor },
      
      // Queijos - Staphylococcus
      { dataInoculacao: datas[0], dataPrevistaLeitura: datas[0], dataRealLeitura: datas[0], produtoId: produtos[2]._id, categoria: "Queijos", microrganismo: "Staphylococcus aureus", statusCiclo: "lida", statusConformidade: "APROVADO", resultado: 500, criadoPor },
      { dataInoculacao: datas[2], dataPrevistaLeitura: datas[2], dataRealLeitura: datas[2], produtoId: produtos[2]._id, categoria: "Queijos", microrganismo: "Staphylococcus aureus", statusCiclo: "lida", statusConformidade: "REPROVADO", resultado: 2000, criadoPor },
      { dataInoculacao: datas[4], dataPrevistaLeitura: datas[4], dataRealLeitura: null, produtoId: produtos[2]._id, categoria: "Queijos", microrganismo: "Staphylococcus aureus", statusCiclo: "inoculada", statusConformidade: "PENDENTE", resultado: null, criadoPor }
    ];

    await Analise.insertMany(analises);

    res.json({
      sucesso: true,
      mensagem: "Dados de teste criados com sucesso",
      dados: {
        produtosCount: produtos.length,
        padroesCount: padroes.length,
        analisesCount: analises.length
      }
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
    const usuario = await Usuario.findById(usuarioId).select("-senha");
    if (!usuario) {
      return res.status(404).json({ sucesso: false, mensagem: "Usuário não encontrado" });
    }
    res.json({
      sucesso: true,
      mensagem: "Usuário encontrado",
      dados: { _id: usuario._id, nome: usuario.nome, perfil: usuario.perfil }
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// DASHBOARD
app.get("/api/dashboard/categorias", autenticar, async (req, res) => {
  try {
    const analises = await Analise.find({});
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const categorias = new Map();

    for (const analise of analises) {
      const cat = analise.categoria || "Sem Categoria";
      if (!categorias.has(cat)) {
        categorias.set(cat, {
          categoria: cat,
          totalAnalises: 0,
          // Eixo 1: Ciclo
          inoculadas: 0,
          aguardandoLeitura: 0,
          atrasadas: 0,
          lidas: 0,
          // Eixo 2: Conformidade (só das lidas)
          aprovadas: 0,
          reprovadas: 0,
          semPadrao: 0,
          pendentes: 0,
          criticidade: "CONFORME"
        });
      }
      const stats = categorias.get(cat);
      stats.totalAnalises++;

      // Ciclo
      if (analise.statusCiclo === "inoculada") {
        stats.inoculadas++;
      } else if (analise.statusCiclo === "aguardando_leitura") {
        stats.aguardandoLeitura++;
        const prev = analise.dataPrevistaLeitura ? new Date(analise.dataPrevistaLeitura) : null;
        if (prev && prev < hoje) stats.atrasadas++;
      } else if (analise.statusCiclo === "lida") {
        stats.lidas++;
      }

      // Conformidade
      if (analise.statusConformidade === "APROVADO") {
        stats.aprovadas++;
      } else if (analise.statusConformidade === "REPROVADO") {
        stats.reprovadas++;
      } else if (analise.statusConformidade === "SEM_PADRÃO") {
        stats.semPadrao++;
      } else if (analise.statusConformidade === "PENDENTE") {
        stats.pendentes++;
      }
    }

    // Criticidade: baseada em % de reprovação sobre as lidas
    for (const stats of categorias.values()) {
      const totalLidas = stats.lidas || 0;
      const taxaReprov = totalLidas > 0 ? (stats.reprovadas / totalLidas) * 100 : 0;
      if (taxaReprov >= 30) stats.criticidade = "CRÍTICO";
      else if (taxaReprov >= 10 || stats.atrasadas > 0) stats.criticidade = "ATENÇÃO";
      else stats.criticidade = "CONFORME";
      stats.taxaReprovacao = Math.round(taxaReprov);
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

// ========== MICRORGANISMO ENDPOINTS ==========
// GET todos os microrganismos
app.get("/api/microrganismos", autenticar, async (req, res) => {
  try {
    const microrganismos = await Microrganismo.find({ ativo: true });
    res.json({
      sucesso: true,
      mensagem: "Microrganismos carregados",
      dados: microrganismos
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// POST criar microrganismo
app.post("/api/microrganismos", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ sucesso: false, mensagem: "Nome do microrganismo é obrigatório" });
    }
    
    const existe = await Microrganismo.findOne({ nome: nome.trim() });
    if (existe) {
      return res.status(400).json({ sucesso: false, mensagem: "Microrganismo já existe" });
    }
    
    const microrganismo = new Microrganismo({ nome: nome.trim() });
    await microrganismo.save();
    
    res.status(201).json({
      sucesso: true,
      mensagem: "Microrganismo criado",
      dados: microrganismo
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// PUT atualizar microrganismo
app.put("/api/microrganismos/:id", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const { nome, ativo } = req.body;
    
    const dadosAtualizacao: any = {};
    if (nome !== undefined) dadosAtualizacao.nome = nome.trim();
    if (ativo !== undefined) dadosAtualizacao.ativo = ativo;
    
    const microrganismo = await Microrganismo.findByIdAndUpdate(
      req.params.id,
      dadosAtualizacao,
      { new: true }
    );
    
    if (!microrganismo) {
      return res.status(404).json({ sucesso: false, mensagem: "Microrganismo não encontrado" });
    }
    
    res.json({
      sucesso: true,
      mensagem: "Microrganismo atualizado",
      dados: microrganismo
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// DELETE microrganismo
app.delete("/api/microrganismos/:id", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const microrganismo = await Microrganismo.findByIdAndDelete(req.params.id);
    
    if (!microrganismo) {
      return res.status(404).json({ sucesso: false, mensagem: "Microrganismo não encontrado" });
    }
    
    res.json({
      sucesso: true,
      mensagem: "Microrganismo deletado",
      dados: { nome: microrganismo.nome }
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// ========== PADRÃO ENDPOINTS ==========
// GET padrões por categoria
app.get("/api/padroes/:categoria", autenticar, async (req, res) => {
  try {
    const { categoria } = req.params;
    const padroes = await Padrao.find({ categoria, ativo: true });
    res.json({
      sucesso: true,
      mensagem: "Padrões carregados",
      dados: padroes
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// GET todos os padrões
app.get("/api/padroes", autenticar, async (req, res) => {
  try {
    const padroes = await Padrao.find({ ativo: true });
    res.json({
      sucesso: true,
      mensagem: "Padrões carregados",
      dados: padroes
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// POST criar padrão
app.post("/api/padroes", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const { categoria, microrganismo, limiteMinimo, limiteMaximo, unidade, criticidade, vigem } = req.body;
    
    if (!categoria || !microrganismo || limiteMinimo === undefined || limiteMaximo === undefined || !vigem) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Categoria, microrganismo, limites e vigência são obrigatórios" 
      });
    }
    
    // Validar se microrganismo existe
    const micro = await Microrganismo.findById(microrganismo);
    if (!micro) {
      return res.status(400).json({ sucesso: false, mensagem: "Microrganismo não encontrado" });
    }
    
    // Validar se já existe padrão para essa combinação
    const existe = await Padrao.findOne({ categoria, microrganismo, ativo: true });
    if (existe) {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: "Já existe padrão para esse microrganismo nessa categoria" 
      });
    }
    
    const padrao = new Padrao({
      categoria,
      microrganismo,
      limiteMinimo,
      limiteMaximo,
      unidade: unidade || "UFC/mL",
      criticidade: criticidade || "CONFORME",
      vigem: new Date(vigem)
    });
    
    await padrao.save();
    
    // Registrar auditoria
    await registrarAuditoriaPadrao(
      padrao._id.toString(),
      (req.usuario as any).id,
      (req.usuario as any).nome,
      "criar",
      { categoria, microrganismo, limiteMinimo, limiteMaximo, unidade, vigem },
      undefined,
      `Novo padrão criado para ${categoria} - ${micro.nome}`
    );
    
    res.status(201).json({
      sucesso: true,
      mensagem: "Padrão criado",
      dados: padrao
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// PUT atualizar padrão
app.put("/api/padroes/:id", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const { limiteMinimo, limiteMaximo, criticidade, vigem, ativo } = req.body;
    
    // Buscar padrão anterior para auditoria
    const padraoAnterior = await Padrao.findById(req.params.id);
    if (!padraoAnterior) {
      return res.status(404).json({ sucesso: false, mensagem: "Padrão não encontrado" });
    }
    
    const dadosAtualizacao: any = {};
    if (limiteMinimo !== undefined) dadosAtualizacao.limiteMinimo = limiteMinimo;
    if (limiteMaximo !== undefined) dadosAtualizacao.limiteMaximo = limiteMaximo;
    if (criticidade !== undefined) dadosAtualizacao.criticidade = criticidade;
    if (vigem !== undefined) dadosAtualizacao.vigem = new Date(vigem);
    if (ativo !== undefined) dadosAtualizacao.ativo = ativo;
    
    const padrao = await Padrao.findByIdAndUpdate(
      req.params.id,
      dadosAtualizacao,
      { new: true }
    );
    
    // Registrar auditoria
    const camposAlterados: string[] = [];
    if (limiteMinimo !== undefined) camposAlterados.push(`limiteMinimo: ${padraoAnterior.limiteMinimo} → ${limiteMinimo}`);
    if (limiteMaximo !== undefined) camposAlterados.push(`limiteMaximo: ${padraoAnterior.limiteMaximo} → ${limiteMaximo}`);
    if (criticidade !== undefined) camposAlterados.push(`criticidade: ${padraoAnterior.criticidade} → ${criticidade}`);
    if (vigem !== undefined) camposAlterados.push(`vigem: ${padraoAnterior.vigem} → ${vigem}`);
    if (ativo !== undefined) camposAlterados.push(`ativo: ${padraoAnterior.ativo} → ${ativo}`);
    
    await registrarAuditoriaPadrao(
      req.params.id,
      (req.usuario as any).id,
      (req.usuario as any).nome,
      "editar",
      dadosAtualizacao,
      padraoAnterior.toObject(),
      `Padrão atualizado: ${camposAlterados.join(", ")}`
    );
    
    res.json({
      sucesso: true,
      mensagem: "Padrão atualizado",
      dados: padrao
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// DELETE padrão
app.delete("/api/padroes/:id", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const padrao = await Padrao.findByIdAndDelete(req.params.id);
    
    if (!padrao) {
      return res.status(404).json({ sucesso: false, mensagem: "Padrão não encontrado" });
    }
    
    // Registrar auditoria
    await registrarAuditoriaPadrao(
      req.params.id,
      (req.usuario as any).id,
      (req.usuario as any).nome,
      "deletar",
      { categoria: padrao.categoria, microrganismo: padrao.microrganismo },
      padrao.toObject(),
      `Padrão deletado: ${padrao.categoria} - ${padrao.microrganismo}`
    );
    
    res.json({
      sucesso: true,
      mensagem: "Padrão deletado",
      dados: { categoria: padrao.categoria, microrganismo: padrao.microrganismo }
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// ========== ENDPOINTS PRODUTOS ==========

app.get("/api/produtos", autenticar, async (req, res) => {
  try {
    const { categoria } = req.query;
    let query = {};
    if (categoria) {
      query = { categoria: categoria as string, ativo: true };
    } else {
      query = { ativo: true };
    }
    const produtos = await Produto.find(query).sort({ categoria: 1, nome: 1 });
    res.json({
      sucesso: true,
      dados: produtos
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

app.post("/api/produtos", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const { nome, categoria, descricao } = req.body;
    
    if (!nome || !categoria) {
      return res.status(400).json({ sucesso: false, mensagem: "Nome e categoria são obrigatórios" });
    }
    
    const verificarDuplicado = await Produto.findOne({ nome: nome.trim(), categoria: categoria.trim() });
    if (verificarDuplicado) {
      return res.status(409).json({ sucesso: false, mensagem: "Produto já existe nesta categoria" });
    }
    
    const produto = new Produto({
      nome: nome.trim(),
      categoria: categoria.trim(),
      descricao: descricao?.trim() || ""
    });
    
    await produto.save();
    res.status(201).json({
      sucesso: true,
      mensagem: "Produto criado",
      dados: produto
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

app.put("/api/produtos/:id", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const { nome, categoria, descricao } = req.body;
    
    const atualizacoes: any = {};
    if (nome) atualizacoes.nome = nome.trim();
    if (categoria) atualizacoes.categoria = categoria.trim();
    if (descricao !== undefined) atualizacoes.descricao = descricao.trim();
    
    const produto = await Produto.findByIdAndUpdate(req.params.id, atualizacoes, { new: true });
    
    if (!produto) {
      return res.status(404).json({ sucesso: false, mensagem: "Produto não encontrado" });
    }
    
    res.json({
      sucesso: true,
      mensagem: "Produto atualizado",
      dados: produto
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

app.delete("/api/produtos/:id", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const produto = await Produto.findByIdAndDelete(req.params.id);
    
    if (!produto) {
      return res.status(404).json({ sucesso: false, mensagem: "Produto não encontrado" });
    }
    
    res.json({
      sucesso: true,
      mensagem: "Produto deletado",
      dados: { nome: produto.nome, categoria: produto.categoria }
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

// ========== AUDITORIA - GET LOGS ==========
app.get("/api/auditoria/padroes", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const logs = await AuditoriaPadrao.find()
      .sort({ timestamp: -1 })
      .limit(500)
      .populate('usuarioId', 'nome');
    
    res.json({
      sucesso: true,
      mensagem: "Logs de auditoria de padrões",
      dados: logs
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// GET auditoria de um padrão específico
app.get("/api/auditoria/padroes/:padraoId", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const logs = await AuditoriaPadrao.find({ padraoId: req.params.padraoId })
      .sort({ timestamp: -1 })
      .populate('usuarioId', 'nome');
    
    res.json({
      sucesso: true,
      mensagem: "Logs de auditoria do padrão",
      dados: logs
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
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

export default app;
