import mongoose, { Schema, Document } from "mongoose";
import { PerfilUsuario } from "../types/shared-types";

export interface IUsuario extends Document {
  email: string;
  nome: string;
  perfis: PerfilUsuario[];
  ativo: boolean;
  criadoEm: Date;
}

const usuarioSchema = new Schema<IUsuario>({
  email: {
    type: String,
    required: [true, "Email é obrigatório"],
    unique: true,
    lowercase: true,
    trim: true
  },
  nome: {
    type: String,
    required: [true, "Nome é obrigatório"],
    trim: true
  },
  perfis: {
    type: [String],
    enum: ["admin", "supervisor", "analista"],
    default: ["analista"]
  },
  ativo: {
    type: Boolean,
    default: true
  },
  criadoEm: {
    type: Date,
    default: () => new Date()
  }
});

// Índice para busca por email
usuarioSchema.index({ email: 1 });
usuarioSchema.index({ ativo: 1 });

export const Usuario = mongoose.model<IUsuario>("Usuario", usuarioSchema);
