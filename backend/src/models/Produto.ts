import mongoose from "mongoose";

export interface IProdutoDocument extends mongoose.Document {
  nome: string;
  categoria: string;
  descricao?: string;
  ativo: boolean;
  criadoEm: Date;
}

const produtoSchema = new mongoose.Schema<IProdutoDocument>(
  {
    nome: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    categoria: {
      type: String,
      required: true,
      index: true
    },
    descricao: String,
    ativo: {
      type: Boolean,
      default: true,
      index: true
    },
    criadoEm: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

export const Produto = mongoose.model<IProdutoDocument>("Produto", produtoSchema);
