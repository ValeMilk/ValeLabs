import mongoose from "mongoose";
import {
  StatusCicloAnalise,
  StatusConformidade,
  PadraoSnapshot,
  calcularStatusCiclo,
  calcularStatusConformidade
} from "../../shared-types";

export interface IAnaliseDocument extends mongoose.Document {
  dataInoculacao: Date;
  dataPrevistaLeitura: Date;
  dataRealLeitura: Date | null;
  
  produtoId: mongoose.Types.ObjectId;
  categoria: string;
  pontoColeta: string;
  microrganismo: string;
  
  resultado: number | "INC" | null;
  
  statusCiclo: StatusCicloAnalise;
  statusConformidade: StatusConformidade;
  
  padraoVigenteId: mongoose.Types.ObjectId | null;
  padraoVigenteSnapshot: PadraoSnapshot | null;
  
  criadoPor: string;
  criadoEm: Date;
  alteradoPor: string | null;
  alteradoEm: Date | null;
  
  dataAuditar?: boolean;
  motivo?: string;
}

const analiseSchema = new mongoose.Schema<IAnaliseDocument>(
  {
    dataInoculacao: {
      type: Date,
      required: true,
      index: true
    },
    dataPrevistaLeitura: {
      type: Date,
      required: true
    },
    dataRealLeitura: {
      type: Date,
      default: null
    },
    
    produtoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Produto",
      required: true,
      index: true
    },
    categoria: {
      type: String,
      required: true,
      index: true
    },
    pontoColeta: {
      type: String,
      required: true
    },
    microrganismo: {
      type: String,
      required: true,
      index: true
    },
    
    resultado: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      validate: {
        validator: function(v: any) {
          return v === null || v === "INC" || typeof v === "number";
        },
        message: "Resultado deve ser null, 'INC' ou número"
      }
    },
    
    statusCiclo: {
      type: String,
      enum: Object.values(StatusCicloAnalise),
      default: StatusCicloAnalise.INOCULADA
    },
    statusConformidade: {
      type: String,
      enum: Object.values(StatusConformidade),
      default: StatusConformidade.PENDENTE
    },
    
    padraoVigenteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Padrao",
      default: null
    },
    padraoVigenteSnapshot: {
      type: {
        limiteIdeal: Number,
        limiteMaximo: Number,
        vigemDe: Date
      },
      default: null
    },
    
    criadoPor: {
      type: String,
      required: true
    },
    criadoEm: {
      type: Date,
      default: Date.now
    },
    alteradoPor: {
      type: String,
      default: null
    },
    alteradoEm: {
      type: Date,
      default: null
    },
    
    dataAuditar: {
      type: Boolean,
      default: false
    },
    motivo: String
  },
  { timestamps: { createdAt: "criadoEm", updatedAt: "alteradoEm" } }
);

// Índices compostos para queries comuns
analiseSchema.index({ categoria: 1, microrganismo: 1, dataInoculacao: -1 });
analiseSchema.index({ produtoId: 1, dataInoculacao: -1 });
analiseSchema.index({ padraoVigenteId: 1 });
analiseSchema.index({ dataAuditar: 1, statusCiclo: 1 });

// Middleware pré-save para recalcular status
analiseSchema.pre("save", function(next) {
  this.statusCiclo = calcularStatusCiclo(
    this.dataRealLeitura,
    this.dataPrevistaLeitura
  );
  
  this.statusConformidade = calcularStatusConformidade(
    this.resultado,
    this.padraoVigenteSnapshot
  );
  
  next();
});

export const Analise = mongoose.model<IAnaliseDocument>("Analise", analiseSchema);
