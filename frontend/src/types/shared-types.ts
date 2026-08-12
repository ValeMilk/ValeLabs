// ========== ENUMS ==========

export enum StatusConformidade {
  APROVADO = "APROVADO",
  REPROVADO = "REPROVADO",
  PENDENTE = "PENDENTE",
  SEM_PADRÃO = "SEM_PADRÃO",
}

export enum StatusCicloAnalise {
  INOCULADA = "inoculada",
  AGUARDANDO_LEITURA = "aguardando_leitura",
  LIDA = "lida",
}

export enum Criticidade {
  CRÍTICO = "CRÍTICO",
  ATENÇÃO = "ATENÇÃO",
  CONFORME = "CONFORME",
}

export enum PerfilUsuario {
  ANALISTA = "analista",
  SUPERVISOR = "supervisor",
  ADMIN = "admin",
}

// ========== INTERFACES ==========

export interface PadraoSnapshot {
  padraoId: string;
  limiteMaximo: number;
  limiteMinimo: number;
  unidade: string;
  criticidade: Criticidade;
  dataVigencia: Date;
}

export interface Analise {
  _id?: string;
  dataInoculacao: Date;
  dataPrevistaLeitura: Date;
  dataRealLeitura: Date | null;
  produtoId: string;
  categoria: string;
  pontoColeta: string;
  microrganismo: string;
  resultado: number | "INC" | null;
  statusCiclo: StatusCicloAnalise;
  statusConformidade: StatusConformidade;
  padraoVigenteId: string | null;
  padraoVigenteSnapshot: PadraoSnapshot | null;
  criadoPor: string;
  criadoEm: Date;
  alteradoPor: string | null;
  alteradoEm: Date | null;
}

export interface CriarAnaliseRequest {
  dataInoculacao: string;
  dataPrevistaLeitura: string;
  produtoId: string;
  categoria: string;
  pontoColeta: string;
  microrganismo: string;
  motivo?: string;
}

export interface AtualizarAnaliseRequest {
  dataRealLeitura?: string;
  resultado?: number | "INC";
  motivo?: string;
  statusCiclo?: StatusCicloAnalise;
}

export interface Padrao {
  _id?: string;
  categoria: string;
  microrganismo: string;
  limiteMinimo: number;
  limiteMaximo: number;
  unidade: string;
  criticidade: Criticidade;
  vigem: Date;
  proximaDataVigem: Date | null;
  ativo: boolean;
  criadoEm: Date;
  alteradoEm: Date | null;
}

export interface CriarPadraoRequest {
  categoria: string;
  microrganismo: string;
  limiteMinimo: number;
  limiteMaximo: number;
  limiteIdeal?: number;
  unidade: string;
  criticidade: Criticidade;
  vigem: string;
  vigemDe?: string;
  vigemAte?: string;
  observacoes?: string;
}

export interface Produto {
  _id?: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  criadoEm: Date;
}

export interface Usuario {
  _id?: string;
  email: string;
  nome: string;
  senha?: string;
  perfil: PerfilUsuario[];
  ativo: boolean;
  criadoEm: Date;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  usuario: {
    _id: string;
    email: string;
    nome: string;
    perfil: PerfilUsuario[];
  };
}

export interface ApiResponse<T> {
  sucesso: boolean;
  mensagem: string;
  dados?: T;
}

export interface PaginatedResponse<T> {
  dados: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface DashboardCategoria {
  categoria: string;
  totalAnalises: number;
  // Eixo 1: Ciclo
  inoculadas: number;
  aguardandoLeitura: number;
  atrasadas: number;
  lidas: number;
  // Eixo 2: Conformidade
  aprovadas: number;
  reprovadas: number;
  semPadrao: number;
  pendentes: number;
  taxaReprovacao: number;
  criticidade: Criticidade;
}

export interface TendenciaAgregada {
  data: Date;
  microrganismo: string;
  percentualAprovacao: number;
  totalAnalises: number;
  aprovadas: number;
}

export interface ComparacaoMicrorganismo {
  microrganismo: string;
  resultado: number | "INC" | null;
  limiteMaximo: number;
  status: StatusConformidade;
  dataAnalise: Date;
}

// ========== HELPER FUNCTIONS ==========

export function calcularStatusCiclo(
  dataInoculacao: Date,
  dataPrevistaLeitura: Date,
  dataRealLeitura: Date | null
): StatusCicloAnalise {
  if (dataRealLeitura) {
    return StatusCicloAnalise.LIDA;
  }
  
  const agora = new Date();
  if (agora >= dataPrevistaLeitura) {
    return StatusCicloAnalise.AGUARDANDO_LEITURA;
  }
  
  return StatusCicloAnalise.INOCULADA;
}

export function calcularStatusConformidade(
  resultado: number | "INC" | null,
  padraoSnapshot: PadraoSnapshot | null
): StatusConformidade {
  if (!padraoSnapshot) {
    return StatusConformidade.SEM_PADRÃO;
  }
  
  if (resultado === null || resultado === "INC") {
    return StatusConformidade.PENDENTE;
  }
  
  if (resultado > padraoSnapshot.limiteMaximo) {
    return StatusConformidade.REPROVADO;
  }
  
  return StatusConformidade.APROVADO;
}

export function determinarCriticidade(
  analises: Analise[],
  categoria?: string
): Criticidade {
  // Filtra por categoria se fornecida
  const analisesCategoria = categoria
    ? analises.filter((a) => a.categoria === categoria)
    : analises;

  if (analisesCategoria.length === 0) {
    return Criticidade.CONFORME;
  }

  // A criticidade é a "pior" entre as análises
  let pior = Criticidade.CONFORME;

  for (const analise of analisesCategoria) {
    const criticidade = analise.padraoVigenteSnapshot?.criticidade;
    
    if (criticidade === Criticidade.CRÍTICO) {
      pior = Criticidade.CRÍTICO;
    } else if (
      criticidade === Criticidade.ATENÇÃO &&
      pior !== Criticidade.CRÍTICO
    ) {
      pior = Criticidade.ATENÇÃO;
    }
  }

  return pior;
}

export function formatarData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatarDataHora(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
