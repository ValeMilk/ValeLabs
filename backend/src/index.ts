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
  perfil: { type: String, enum: ["Admin", "Diretora", "Qualidade"], default: "Qualidade" },
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
    res.status(401).json({ sucesso: false, mensagem: "Token inválido" });
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
    // Limpar usuários antigos
    await Usuario.deleteMany({});
    
    // Criar usuários de teste com diferentes perfis
    const usuarios = [
      { nome: "Admin", perfil: "Admin", senha: "Admin@123" },
      { nome: "Diretora", perfil: "Diretora", senha: "Diretora@123" },
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
    const { nome, perfil, ativo } = req.body;
    if (!nome && !perfil && ativo === undefined) {
      return res.status(400).json({ sucesso: false, mensagem: "Forneça pelo menos um campo para atualizar" });
    }
    const usuario = await Usuario.findByIdAndUpdate(req.params.id, { nome, perfil, ativo }, { new: true }).select("-senha");
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

export default app;
