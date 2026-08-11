import mongoose from "mongoose";

export interface IPadraoDocument extends mongoose.Document {
  categoria: string;
  microrganismo: string;
  chaveComposta: string;
  
  limiteIdeal: number;
  limiteMaximo: number;
  
  vigemDe: Date;
  vigemAte: Date | null;
  ativo: boolean;
  
  criadoPor: string;
  criadoEm: Date;
  observacoes?: string;
}

const padraoSchema = new mongoose.Schema<IPadraoDocument>(
  {
    categoria: {
      type: String,
      required: true,
      index: true
    },
    microrganismo: {
      type: String,
      required: true,
      index: true
    },
    chaveComposta: {
      type: String,
      required: true,
      unique: false,  // Múltiplas versões temporais
      index: true
    },
    
    limiteIdeal: {
      type: Number,
      required: true,
      validate: {
        validator: function(v: number) {
          return v > 0;
        },
        message: "Limite ideal deve ser > 0"
      }
    },
    limiteMaximo: {
      type: Number,
      required: true,
      validate: {
        validator: function(v: number) {
          return v > 0 && v >= (this as any).limiteIdeal;
        },
        message: "Limite máximo deve ser >= limite ideal"
      }
    },
    
    vigemDe: {
      type: Date,
      required: true,
      index: true
    },
    vigemAte: {
      type: Date,
      default: null,
      index: true
    },
    ativo: {
      type: Boolean,
      default: true,
      index: true
    },
    
    criadoPor: {
      type: String,
      required: true
    },
    criadoEm: {
      type: Date,
      default: Date.now
    },
    observacoes: String
  },
  { timestamps: false }
);

// Índice composto para buscar padrão vigente
padraoSchema.index({ chaveComposta: 1, vigemDe: -1, vigemAte: 1 });
padraoSchema.index({ ativo: 1, vigemAte: 1 });

export const Padrao = mongoose.model<IPadraoDocument>("Padrao", padraoSchema);
