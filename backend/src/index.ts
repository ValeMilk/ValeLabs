import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Variável de ambiente obrigatória ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/valelabs";
const JWT_SECRET = requireEnv("JWT_SECRET");

// Endpoints de seed/populate só ficam ativos com opt-in explícito — nunca por padrão,
// mesmo que NODE_ENV esteja ausente ou mal configurado em produção.
const ALLOW_DEV_ENDPOINTS = process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_SEED === "true";

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

// Entidade "macro" dos Parâmetros globais — hoje só guarda a faixa de pH.
// Padrão, Produto e Análise continuam usando categoria como string solta;
// esta coleção não normaliza nem faz cascata sobre elas.
const categoriaSchema = new mongoose.Schema({
  nome: { type: String, required: true, unique: true },
  phMinimo: { type: Number, required: true },
  phMaximo: { type: Number, required: true },
  ativo: { type: Boolean, default: true },
  criadoEm: { type: Date, default: Date.now }
});

const analiseSchema = new mongoose.Schema({
  dataInoculacao: { type: Date, required: true },
  dataPrevistaLeitura: { type: Date, required: true },
  dataRealLeitura: { type: Date, default: null },
  lote: { type: String, default: "" },
  produtoId: { type: String, required: true },
  produtoNome: { type: String, default: "" },
  categoria: { type: String, required: true },
  pontoColeta: { type: String, default: "" },
  microrganismo: { type: String, required: true },
  resultado: { type: mongoose.Schema.Types.Mixed, default: null },
  observacoes: { type: String, default: "" },
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

const auditoriaAnaliseSchema = new mongoose.Schema({
  analiseId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", index: true },
  usuarioNome: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: -1 },
  acao: { type: String, enum: ["criar", "editar", "deletar"], required: true },
  // Identificação copiada no momento do registro: o log precisa continuar
  // legível mesmo depois que a análise for excluída.
  produtoNome: String,
  microrganismo: String,
  categoria: String,
  lote: String,
  dados: mongoose.Schema.Types.Mixed,
  dadosAntigos: mongoose.Schema.Types.Mixed,
  descricao: String
});

const Usuario = mongoose.model("Usuario", usuarioSchema);
const Produto = mongoose.model("Produto", produtoSchema);
const Padrao = mongoose.model("Padrao", padraoSchema);
const Microrganismo = mongoose.model("Microrganismo", microrganismoSchema);
const Analise = mongoose.model("Analise", analiseSchema);
const AuditoriaPadrao = mongoose.model("AuditoriaPadrao", auditoriaPadraoSchema);
const AuditoriaAnalise = mongoose.model("AuditoriaAnalise", auditoriaAnaliseSchema);
const Categoria = mongoose.model("Categoria", categoriaSchema);

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

// Perfis de gestão. Atenção ao nome: este middleware BLOQUEIA o perfil "Qualidade",
// que é operacional e só pode registrar leituras (editar análises).
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

// A auditoria nunca deve derrubar a operação que a originou: falhas aqui são
// apenas logadas, e o lançamento em si segue válido.
async function registrarAuditoriaAnalise(
  analise: any,
  usuario: any,
  acao: "criar" | "editar" | "deletar",
  dados: any,
  dadosAntigos?: any,
  descricao?: string
) {
  try {
    await new AuditoriaAnalise({
      analiseId: analise._id,
      usuarioId: mongoose.isValidObjectId(usuario?.id) ? usuario.id : undefined,
      usuarioNome: usuario?.nome || "Sistema",
      acao,
      produtoNome: analise.produtoNome || "",
      microrganismo: analise.microrganismo || "",
      categoria: analise.categoria || "",
      lote: analise.lote || "",
      dados,
      dadosAntigos,
      descricao
    }).save();
  } catch (erro) {
    console.error("Erro ao registrar auditoria de análise:", erro);
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
    // Requer opt-in explícito via ALLOW_DEV_SEED=true — nunca habilitado por padrão
    if (!ALLOW_DEV_ENDPOINTS) {
      return res.status(403).json({ sucesso: false, mensagem: "Não permitido" });
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
    // Requer opt-in explícito via ALLOW_DEV_SEED=true — nunca habilitado por padrão
    if (!ALLOW_DEV_ENDPOINTS) {
      return res.status(403).json({ sucesso: false, mensagem: "Não permitido" });
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

// Status efetivo de uma análise, calculado a partir das datas em vez de confiar
// no statusCiclo gravado (que não é atualizado automaticamente com o tempo).
function statusCicloEfetivo(analise: any, hoje: Date): "lida" | "atrasada" | "vence_hoje" | "aguardando" {
  if (analise.dataRealLeitura) return "lida";
  const prevista = analise.dataPrevistaLeitura ? new Date(analise.dataPrevistaLeitura) : null;
  if (!prevista) return "aguardando";
  const previstaDia = new Date(prevista);
  previstaDia.setHours(0, 0, 0, 0);
  if (previstaDia < hoje) return "atrasada";
  if (previstaDia.getTime() === hoje.getTime()) return "vence_hoje";
  return "aguardando";
}

// Nível 2: mapa de calor Produto × Microrganismo, ranking dos piores pares e backlog de leituras
app.get("/api/dashboard/heatmap", autenticar, async (req, res) => {
  try {
    const analises = await Analise.find({}).lean();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const pares = new Map<string, {
      produto: string; microrganismo: string; categoria: string;
      avaliadas: number; aprovadas: number; reprovadas: number;
    }>();
    const backlog: any[] = [];

    let aprovadasTotal = 0;
    let reprovadasTotal = 0;

    for (const analise of analises) {
      const produto = (analise as any).produtoNome || "Sem produto";
      const microrganismo = analise.microrganismo || "Desconhecido";
      const chave = `${produto}|||${microrganismo}`;

      if (!pares.has(chave)) {
        pares.set(chave, {
          produto,
          microrganismo,
          categoria: analise.categoria || "",
          avaliadas: 0,
          aprovadas: 0,
          reprovadas: 0
        });
      }
      const par = pares.get(chave)!;

      if (analise.statusConformidade === "APROVADO") {
        par.avaliadas++;
        par.aprovadas++;
        aprovadasTotal++;
      } else if (analise.statusConformidade === "REPROVADO") {
        par.avaliadas++;
        par.reprovadas++;
        reprovadasTotal++;
      }

      const efetivo = statusCicloEfetivo(analise, hoje);
      if (efetivo !== "lida") {
        backlog.push({
          id: analise._id,
          produto,
          microrganismo,
          categoria: analise.categoria || "",
          lote: (analise as any).lote || "",
          badge: efetivo === "atrasada" ? "atrasada" : efetivo === "vence_hoje" ? "vence_hoje" : "aguardando",
          dataInoculacao: analise.dataInoculacao,
          dataPrevistaLeitura: analise.dataPrevistaLeitura
        });
      }
    }

    const celulas = Array.from(pares.values()).map((p) => ({
      ...p,
      percentual: p.avaliadas > 0 ? (p.reprovadas / p.avaliadas) * 100 : null
    }));

    const produtos = Array.from(new Set(celulas.map((c) => c.produto))).sort();
    const microrganismos = Array.from(new Set(celulas.map((c) => c.microrganismo))).sort();

    const topPares = celulas
      .filter((c) => c.avaliadas > 0)
      .sort((a, b) => (b.percentual || 0) - (a.percentual || 0))
      .slice(0, 5);

    // Coluna TOTAL do mapa de calor: reprovação do produto somando todos os microrganismos.
    const totaisPorProduto = produtos.map((nome) => {
      const doProduto = celulas.filter((c) => c.produto === nome);
      const avaliadas = doProduto.reduce((s, c) => s + c.avaliadas, 0);
      const reprovadas = doProduto.reduce((s, c) => s + c.reprovadas, 0);
      return {
        produto: nome,
        categoria: doProduto[0]?.categoria || "",
        avaliadas,
        reprovadas,
        percentual: avaliadas > 0 ? (reprovadas / avaliadas) * 100 : null
      };
    });

    backlog.sort((a, b) => {
      if (a.badge === "atrasada" && b.badge !== "atrasada") return -1;
      if (b.badge === "atrasada" && a.badge !== "atrasada") return 1;
      return new Date(a.dataPrevistaLeitura).getTime() - new Date(b.dataPrevistaLeitura).getTime();
    });

    res.json({
      sucesso: true,
      mensagem: "Mapa de calor carregado",
      dados: {
        kpis: {
          total: analises.length,
          aprovadas: aprovadasTotal,
          reprovadas: reprovadasTotal
        },
        produtos,
        microrganismos,
        celulas,
        totaisPorProduto,
        topPares,
        backlog
      }
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// Nível 3: detalhe de um par Produto × Microrganismo
app.get("/api/dashboard/detalhe", autenticar, async (req, res) => {
  try {
    const produto = (req.query.produto as string) || "";
    const micro = (req.query.micro as string) || "";

    if (!produto || !micro) {
      return res.status(400).json({ sucesso: false, mensagem: "Parâmetros produto e micro são obrigatórios" });
    }

    const analises = await Analise.find({ produtoNome: produto, microrganismo: micro })
      .sort({ dataInoculacao: -1 })
      .lean();

    const categoria = analises[0]?.categoria || "";
    const padrao = await Padrao.findOne({ categoria, microrganismo: micro, ativo: true }).lean();

    const aprovadas = analises.filter((a) => a.statusConformidade === "APROVADO").length;
    const reprovadas = analises.filter((a) => a.statusConformidade === "REPROVADO").length;
    const aguardando = analises.filter((a) => a.statusConformidade === "PENDENTE").length;

    const historico = analises
      .filter((a) => a.dataRealLeitura && typeof a.resultado === "number")
      .map((a) => ({
        data: a.dataRealLeitura,
        resultado: a.resultado,
        status: a.statusConformidade
      }))
      .sort((a, b) => new Date(a.data!).getTime() - new Date(b.data!).getTime());

    const tabela = analises.map((a) => ({
      lote: (a as any).lote || "",
      dataInoculacao: a.dataInoculacao,
      dataLeitura: a.dataRealLeitura,
      pontoColeta: a.pontoColeta,
      resultado: a.resultado,
      observacoes: (a as any).observacoes || "",
      statusConformidade: a.statusConformidade
    }));

    res.json({
      sucesso: true,
      mensagem: "Detalhe carregado",
      dados: {
        produto,
        microrganismo: micro,
        categoria,
        padrao: padrao
          ? { limiteMinimo: padrao.limiteMinimo, limiteMaximo: padrao.limiteMaximo, unidade: padrao.unidade }
          : null,
        kpis: { total: analises.length, aprovadas, reprovadas, aguardando },
        historico,
        tabela
      }
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

// Resumo do produto: mesmo formato do detalhe, porém somando todos os
// microrganismos. Sem padrão único — cada microrganismo tem os seus limites,
// então o gráfico não traz linhas de mínimo/máximo.
app.get("/api/dashboard/produto", autenticar, async (req, res) => {
  try {
    const produto = (req.query.produto as string) || "";
    if (!produto) {
      return res.status(400).json({ sucesso: false, mensagem: "Parâmetro produto é obrigatório" });
    }

    const analises = await Analise.find({ produtoNome: produto })
      .sort({ dataInoculacao: -1 })
      .lean();

    const categoria = analises[0]?.categoria || "";

    // Unidade por microrganismo, para exibir junto de cada resultado.
    const padroes = await Padrao.find({ categoria, ativo: true }).lean();
    const unidadePorMicro = new Map(padroes.map((p) => [p.microrganismo, p.unidade]));

    const aprovadas = analises.filter((a) => a.statusConformidade === "APROVADO").length;
    const reprovadas = analises.filter((a) => a.statusConformidade === "REPROVADO").length;
    const aguardando = analises.filter((a) => a.statusConformidade === "PENDENTE").length;

    const historico = analises
      .filter((a) => a.dataRealLeitura && typeof a.resultado === "number")
      .map((a) => ({
        data: a.dataRealLeitura,
        resultado: a.resultado,
        status: a.statusConformidade,
        microrganismo: a.microrganismo,
        lote: (a as any).lote || "",
        unidade: unidadePorMicro.get(a.microrganismo) || ""
      }))
      .sort((a, b) => new Date(a.data!).getTime() - new Date(b.data!).getTime());

    const tabela = analises.map((a) => ({
      lote: (a as any).lote || "",
      microrganismo: a.microrganismo,
      dataInoculacao: a.dataInoculacao,
      dataLeitura: a.dataRealLeitura,
      pontoColeta: a.pontoColeta,
      resultado: a.resultado,
      unidade: unidadePorMicro.get(a.microrganismo) || "",
      observacoes: (a as any).observacoes || "",
      statusConformidade: a.statusConformidade
    }));

    res.json({
      sucesso: true,
      mensagem: "Resumo do produto carregado",
      dados: {
        produto,
        categoria,
        microrganismos: Array.from(new Set(analises.map((a) => a.microrganismo))).sort(),
        kpis: { total: analises.length, aprovadas, reprovadas, aguardando },
        historico,
        tabela
      }
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
      microrganismo: micro.nome,
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
      (req as any).usuario.id,
      (req as any).usuario.nome,
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
      (req as any).usuario.id,
      (req as any).usuario.nome,
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
      (req as any).usuario.id,
      (req as any).usuario.nome,
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

// ========== PARÂMETROS: CATEGORIA ==========
// Entidade "macro" da arquitetura de parâmetros (categoria → produto, no futuro).
// Leitura aberta a qualquer autenticado — dado global pra outras telas consumirem.

app.get("/api/parametros/categorias", autenticar, async (req, res) => {
  try {
    const categorias = await Categoria.find({ ativo: true }).sort("nome");
    res.json({
      sucesso: true,
      mensagem: "Categorias carregadas",
      dados: categorias
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

app.post("/api/parametros/categorias", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const { nome, phMinimo, phMaximo } = req.body;

    if (!nome || !nome.trim() || phMinimo === undefined || phMaximo === undefined) {
      return res.status(400).json({ sucesso: false, mensagem: "Nome, pH mínimo e pH máximo são obrigatórios" });
    }

    const existe = await Categoria.findOne({ nome: nome.trim() });
    if (existe) {
      return res.status(409).json({ sucesso: false, mensagem: "Categoria já existe" });
    }

    const categoria = new Categoria({
      nome: nome.trim(),
      phMinimo: parseFloat(phMinimo),
      phMaximo: parseFloat(phMaximo)
    });
    await categoria.save();

    res.status(201).json({
      sucesso: true,
      mensagem: "Categoria criada",
      dados: categoria
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

app.put("/api/parametros/categorias/:id", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const { nome, phMinimo, phMaximo, ativo } = req.body;

    const dadosAtualizacao: any = {};
    if (nome !== undefined) dadosAtualizacao.nome = nome.trim();
    if (phMinimo !== undefined) dadosAtualizacao.phMinimo = parseFloat(phMinimo);
    if (phMaximo !== undefined) dadosAtualizacao.phMaximo = parseFloat(phMaximo);
    if (ativo !== undefined) dadosAtualizacao.ativo = ativo;

    const categoria = await Categoria.findByIdAndUpdate(req.params.id, dadosAtualizacao, { new: true });
    if (!categoria) {
      return res.status(404).json({ sucesso: false, mensagem: "Categoria não encontrada" });
    }

    res.json({
      sucesso: true,
      mensagem: "Categoria atualizada",
      dados: categoria
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

app.delete("/api/parametros/categorias/:id", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const categoria = await Categoria.findByIdAndDelete(req.params.id);
    if (!categoria) {
      return res.status(404).json({ sucesso: false, mensagem: "Categoria não encontrada" });
    }

    res.json({
      sucesso: true,
      mensagem: "Categoria deletada",
      dados: { nome: categoria.nome }
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

// ========== ENDPOINTS ANÁLISES ==========

// Conformidade depende só do limite máximo do padrão — não existe mais reprovação
// por resultado baixo. Um resultado que não é um número válido (ex.: contém
// letras) é tratado como erro de leitura e reprova direto, sem depender de padrão.
function calcularConformidade(
  resultadoBruto: any,
  padrao: { limiteMaximo: number } | null
): { statusConformidade: string; resultadoGravado: number | string | null } {
  if (resultadoBruto === null || resultadoBruto === undefined) {
    return { statusConformidade: "PENDENTE", resultadoGravado: null };
  }
  const texto = String(resultadoBruto).trim();
  if (texto === "") {
    return { statusConformidade: "PENDENTE", resultadoGravado: null };
  }

  const valor = Number(texto);
  if (!Number.isFinite(valor)) {
    // Number() (diferente de parseFloat) rejeita "10abc" inteiro — não existe
    // leitura parcialmente numérica válida.
    return { statusConformidade: "REPROVADO", resultadoGravado: texto };
  }

  if (!padrao) {
    return { statusConformidade: "SEM_PADRÃO", resultadoGravado: valor };
  }

  return {
    statusConformidade: valor <= padrao.limiteMaximo ? "APROVADO" : "REPROVADO",
    resultadoGravado: valor
  };
}

app.get("/api/analises", autenticar, async (req, res) => {
  try {
    const limite = parseInt(req.query.limite as string) || 50;
    const pagina = parseInt(req.query.pagina as string) || 1;
    const skip = (pagina - 1) * limite;

    const filtro: any = {};
    if (req.query.categoria) filtro.categoria = req.query.categoria;
    if (req.query.microrganismo) filtro.microrganismo = req.query.microrganismo;
    if (req.query.produtoId) filtro.produtoId = req.query.produtoId;

    const analises = await Analise.find(filtro)
      .sort({ dataInoculacao: -1 })
      .skip(skip)
      .limit(limite)
      .lean();

    const total = await Analise.countDocuments(filtro);

    return res.json({
      sucesso: true,
      dados: analises
    });
  } catch (erro: any) {
    return res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

// Criar e editar (PATCH) lançamentos são liberados a qualquer perfil autenticado,
// incluindo Qualidade — só deletar continua restrito à gestão.
app.post("/api/analises", autenticar, async (req, res) => {
  try {
    const { categoria, produto, microrganismo, pontoColeta, resultado, lote, observacoes, dataInoculacao, dataPrevistaLeitura } = req.body;

    // resultado e lote são opcionais: sem resultado a análise nasce PENDENTE.
    if (!categoria || !produto || !microrganismo || !pontoColeta) {
      return res.status(400).json({ sucesso: false, mensagem: "Campos obrigatórios faltando" });
    }

    // Buscar o padrão para calcular status correto
    const padrao = await Padrao.findOne({ categoria, microrganismo, ativo: true });
    
    // Buscar nome do produto
    const produtoDoc = await Produto.findById(produto);
    const produtoNome = produtoDoc?.nome || produto;
    
    const { statusConformidade, resultadoGravado } = calcularConformidade(resultado, padrao);
    const temResultado = resultadoGravado !== null;

    const dataPrevistaLeituraFinal = dataPrevistaLeitura ? new Date(dataPrevistaLeitura) : new Date();
    const agora = new Date();
    // Um resultado informado na criação significa que a análise já foi lida agora.
    // Sem resultado, o ciclo depende apenas da data prevista de leitura.
    const statusCiclo = temResultado
      ? "lida"
      : dataPrevistaLeituraFinal <= agora
        ? "aguardando_leitura"
        : "inoculada";

    const analise = new Analise({
      dataInoculacao: dataInoculacao ? new Date(dataInoculacao) : new Date(),
      dataPrevistaLeitura: dataPrevistaLeituraFinal,
      dataRealLeitura: temResultado ? agora : null,
      lote: lote?.trim() || "",
      observacoes: observacoes?.trim() || "",
      produtoId: produto,
      produtoNome: produtoNome,
      categoria,
      pontoColeta,
      microrganismo,
      resultado: resultadoGravado,
      statusCiclo,
      statusConformidade,
      criadoPor: (req as any).usuario?.nome || "Sistema"
    });

    await analise.save();

    await registrarAuditoriaAnalise(
      analise,
      (req as any).usuario,
      "criar",
      {
        lote: analise.lote,
        pontoColeta: analise.pontoColeta,
        resultado: analise.resultado,
        observacoes: analise.observacoes,
        statusConformidade: analise.statusConformidade,
        statusCiclo: analise.statusCiclo
      },
      undefined,
      `Lançamento criado: ${produtoNome} × ${microrganismo}${analise.lote ? ` (lote ${analise.lote})` : ""}`
    );

    return res.status(201).json({
      sucesso: true,
      dados: analise
    });
  } catch (erro: any) {
    return res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

// PATCH atualizar análise
app.patch("/api/analises/:id", autenticar, async (req, res) => {
  try {
    const { resultado, lote, pontoColeta, observacoes } = req.body;

    const analiseAtual = await Analise.findById(req.params.id);
    if (!analiseAtual) {
      return res.status(404).json({ sucesso: false, mensagem: "Análise não encontrada" });
    }

    const dadosAtualizacao: any = {};
    if (lote !== undefined) dadosAtualizacao.lote = String(lote).trim();
    if (pontoColeta !== undefined) dadosAtualizacao.pontoColeta = String(pontoColeta).trim();
    if (observacoes !== undefined) dadosAtualizacao.observacoes = String(observacoes).trim();

    // resultado só é tocado quando a chave vem no corpo — assim editar apenas o
    // lote não apaga um resultado já registrado.
    if (resultado !== undefined) {
      const padrao = await Padrao.findOne({
        categoria: analiseAtual.categoria,
        microrganismo: analiseAtual.microrganismo,
        ativo: true
      });
      const { statusConformidade, resultadoGravado } = calcularConformidade(resultado, padrao);
      dadosAtualizacao.resultado = resultadoGravado;
      dadosAtualizacao.statusConformidade = statusConformidade;

      if (resultadoGravado !== null) {
        dadosAtualizacao.dataRealLeitura = new Date();
        dadosAtualizacao.statusCiclo = "lida";
      } else {
        // Limpar o resultado devolve a análise ao estado pendente.
        dadosAtualizacao.dataRealLeitura = null;
        dadosAtualizacao.statusCiclo =
          new Date(analiseAtual.dataPrevistaLeitura) <= new Date() ? "aguardando_leitura" : "inoculada";
      }
    }

    const analise = await Analise.findByIdAndUpdate(
      req.params.id,
      dadosAtualizacao,
      { new: true }
    );

    // Só registra o que realmente mudou — reenviar os mesmos valores não vira log.
    const rotulos: Record<string, string> = {
      lote: "lote",
      pontoColeta: "ponto de coleta",
      resultado: "resultado",
      observacoes: "observações",
      statusConformidade: "conformidade",
      statusCiclo: "ciclo"
    };
    const antes: any = {};
    const depois: any = {};
    const alteracoes: string[] = [];

    for (const campo of Object.keys(dadosAtualizacao)) {
      const valorAntigo = (analiseAtual as any)[campo] ?? null;
      const valorNovo = (dadosAtualizacao as any)[campo] ?? null;
      if (String(valorAntigo) === String(valorNovo)) continue;
      antes[campo] = valorAntigo;
      depois[campo] = valorNovo;
      if (rotulos[campo]) {
        alteracoes.push(`${rotulos[campo]}: ${valorAntigo ?? "vazio"} → ${valorNovo ?? "vazio"}`);
      }
    }

    if (alteracoes.length > 0) {
      await registrarAuditoriaAnalise(
        analise,
        (req as any).usuario,
        "editar",
        depois,
        antes,
        `Lançamento editado (${analiseAtual.produtoNome} × ${analiseAtual.microrganismo}): ${alteracoes.join(", ")}`
      );
    }

    return res.json({ sucesso: true, dados: analise });
  } catch (erro: any) {
    return res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

// DELETE deletar análise — indisponível para o perfil Qualidade.
app.delete("/api/analises/:id", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const analise = await Analise.findByIdAndDelete(req.params.id);

    if (!analise) {
      return res.status(404).json({ sucesso: false, mensagem: "Análise não encontrada" });
    }

    await registrarAuditoriaAnalise(
      analise,
      (req as any).usuario,
      "deletar",
      {
        lote: analise.lote,
        pontoColeta: analise.pontoColeta,
        resultado: analise.resultado,
        observacoes: analise.observacoes,
        statusConformidade: analise.statusConformidade
      },
      undefined,
      `Lançamento excluído: ${analise.produtoNome} × ${analise.microrganismo}${analise.lote ? ` (lote ${analise.lote})` : ""}`
    );

    return res.json({ sucesso: true, mensagem: "Análise deletada" });
  } catch (erro: any) {
    return res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

// ========== AUDITORIA - GET LOGS ==========

// Histórico de mudanças em lançamentos (criação, edição e exclusão de análises)
app.get("/api/auditoria/analises", autenticar, autorizarQualidade, async (req, res) => {
  try {
    const logs = await AuditoriaAnalise.find()
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();

    res.json({
      sucesso: true,
      mensagem: "Logs de auditoria de lançamentos",
      dados: logs
    });
  } catch (erro: any) {
    res.status(500).json({ sucesso: false, mensagem: erro.message });
  }
});

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

// ========== ERROR HANDLER ==========
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Erro:", err);
  res.status(500).json({ sucesso: false, mensagem: err.message || "Erro interno" });
});

// ========== FUNÇÕES UTILITÁRIAS ==========

// Migração: Preencher produtoNome em análises antigas
async function migrarProdutoNome() {
  try {
    const analisesSemNome = await Analise.find({ produtoNome: { $exists: false } }).limit(1000);
    
    if (analisesSemNome.length === 0) {
      console.log("✅ Nenhuma análise para migrar");
      return;
    }
    
    console.log(`🔄 Migrando ${analisesSemNome.length} análises...`);
    
    for (const analise of analisesSemNome) {
      try {
        const produto = await Produto.findById(analise.produtoId);
        if (produto) {
          analise.produtoNome = produto.nome;
          await analise.save();
        }
      } catch (e) {
        console.error(`Erro ao migrar análise ${analise._id}:`, e);
      }
    }
    
    console.log("✅ Migração de produtoNome concluída");
  } catch (erro) {
    console.error("Erro na migração:", erro);
  }
}

// ========== START SERVER ==========
async function start() {
  try {
    await conectarMongoDB();
    await migrarProdutoNome();
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
