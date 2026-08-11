import mongoose from "mongoose";

export interface ICampoAlterado {
  antes: any;
  depois: any;
}

export interface IAuditoriaLogDocument extends mongoose.Document {
  analiseId: mongoose.Types.ObjectId;
  usuarioId: string;
  usuarioNome: string;
  timestamp: Date;
  acao: "criar" | "editar" | "deletar" | "reler";
  camposAlterados: Record<string, ICampoAlterado>;
  motivoAlteracao?: string;
  ipOrigem?: string;
}

const auditoriaLogSchema = new mongoose.Schema<IAuditoriaLogDocument>(
  {
    analiseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Analise",
      required: true,
      index: true
    },
    usuarioId: {
      type: String,
      required: true,
      index: true
    },
    usuarioNome: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: -1
    },
    acao: {
      type: String,
      enum: ["criar", "editar", "deletar", "reler"],
      required: true
    },
    camposAlterados: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    motivoAlteracao: String,
    ipOrigem: String
  },
  { timestamps: false }
);

// Índices para auditoria
auditoriaLogSchema.index({ analiseId: 1, timestamp: -1 });
auditoriaLogSchema.index({ usuarioId: 1, timestamp: -1 });

// Impedir edição/deleção
auditoriaLogSchema.pre<any>("findByIdAndUpdate", function(next) {
  next(new Error("Logs de auditoria são imutáveis"));
});

auditoriaLogSchema.pre<any>("findByIdAndDelete", function(next) {
  next(new Error("Logs de auditoria não podem ser deletados"));
});

export const AuditoriaLog = mongoose.model<IAuditoriaLogDocument>(
  "AuditoriaLog",
  auditoriaLogSchema
);
