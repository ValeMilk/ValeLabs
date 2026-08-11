/**
 * Script de seed para popular banco de dados com dados de teste
 * Execute com: npm run seed
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Produto, Padrao, Analise } from "../models";

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "", {
      dbName: process.env.MONGO_DB_NAME || "valelabs_microbio"
    });

    console.log("🌱 Começando seed...");

    // 1. Limpar collections (CUIDADO: apenas em desenvolvimento)
    if (process.env.NODE_ENV !== "production") {
      await Promise.all([
        Produto.deleteMany({}),
        Padrao.deleteMany({}),
        Analise.deleteMany({})
      ]);
      console.log("🗑️  Collections limpas");
    }

    // 2. Criar produtos
    const produtos = await Produto.insertMany([
      { nome: "Queijo Meia Cura", categoria: "Queijo", ativo: true },
      { nome: "Queijo Meia Cura Premium", categoria: "Queijo", ativo: true },
      { nome: "Iogurte Natural", categoria: "Iogurte", ativo: true },
      { nome: "Iogurte Grego", categoria: "Iogurte", ativo: true },
      { nome: "Leite Integral", categoria: "Leite", ativo: true },
      { nome: "L.C.M. (Leite Concentrado Esterilizado)", categoria: "L.C.M.", ativo: true }
    ]);

    console.log(`✅ ${produtos.length} produtos criados`);

    // 3. Criar padrões (algumas das 60 combinações)
    const padroes = await Padrao.insertMany([
      // Queijo
      {
        categoria: "Queijo",
        microrganismo: "Coliformes",
        chaveComposta: "Queijo|Coliformes",
        limiteIdeal: 100,
        limiteMaximo: 1000,
        vigemDe: new Date("2024-01-01"),
        ativo: true,
        criadoPor: "system@valemilk.com.br"
      },
      {
        categoria: "Queijo",
        microrganismo: "Bolores e Leveduras",
        chaveComposta: "Queijo|Bolores e Leveduras",
        limiteIdeal: 50,
        limiteMaximo: 500,
        vigemDe: new Date("2024-01-01"),
        ativo: true,
        criadoPor: "system@valemilk.com.br"
      },
      // Iogurte
      {
        categoria: "Iogurte",
        microrganismo: "Coliformes",
        chaveComposta: "Iogurte|Coliformes",
        limiteIdeal: 10,
        limiteMaximo: 100,
        vigemDe: new Date("2024-01-01"),
        ativo: true,
        criadoPor: "system@valemilk.com.br"
      },
      {
        categoria: "Iogurte",
        microrganismo: "Bolores e Leveduras",
        chaveComposta: "Iogurte|Bolores e Leveduras",
        limiteIdeal: 10,
        limiteMaximo: 100,
        vigemDe: new Date("2024-01-01"),
        ativo: true,
        criadoPor: "system@valemilk.com.br"
      },
      // Leite
      {
        categoria: "Leite",
        microrganismo: "Aeróbios Totais",
        chaveComposta: "Leite|Aeróbios Totais",
        limiteIdeal: 10000,
        limiteMaximo: 100000,
        vigemDe: new Date("2024-01-01"),
        ativo: true,
        criadoPor: "system@valemilk.com.br"
      }
    ]);

    console.log(`✅ ${padroes.length} padrões criados`);

    // 4. Criar algumas análises de teste
    const hoje = new Date();
    const analises = await Analise.insertMany([
      {
        dataInoculacao: new Date(hoje.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
        dataPrevistaLeitura: new Date(hoje.getTime() - 24 * 60 * 60 * 1000), // Ontem
        dataRealLeitura: null, // Ainda não lida
        produtoId: produtos[0]._id,
        categoria: "Queijo",
        pontoColeta: "Linha de produção A",
        microrganismo: "Coliformes",
        resultado: null,
        statusCiclo: "aguardando_leitura",
        statusConformidade: "PENDENTE",
        padraoVigenteId: padroes[0]._id,
        padraoVigenteSnapshot: {
          limiteIdeal: 100,
          limiteMaximo: 1000,
          vigemDe: new Date("2024-01-01")
        },
        criadoPor: "analista@valemilk.com.br"
      },
      {
        dataInoculacao: new Date(hoje.getTime() - 1 * 24 * 60 * 60 * 1000), // Ontem
        dataPrevistaLeitura: hoje, // Hoje
        dataRealLeitura: new Date(), // Lida agora
        produtoId: produtos[1]._id,
        categoria: "Queijo",
        pontoColeta: "Câmara fria",
        microrganismo: "Coliformes",
        resultado: 800, // Acima do máximo (1000)
        statusCiclo: "lida",
        statusConformidade: "REPROVADO",
        padraoVigenteId: padroes[0]._id,
        padraoVigenteSnapshot: {
          limiteIdeal: 100,
          limiteMaximo: 1000,
          vigemDe: new Date("2024-01-01")
        },
        criadoPor: "analista@valemilk.com.br"
      },
      {
        dataInoculacao: new Date(hoje.getTime() - 1 * 24 * 60 * 60 * 1000),
        dataPrevistaLeitura: hoje,
        dataRealLeitura: new Date(),
        produtoId: produtos[2]._id,
        categoria: "Iogurte",
        pontoColeta: "Linha de produção B",
        microrganismo: "Coliformes",
        resultado: 5, // Dentro dos limites
        statusCiclo: "lida",
        statusConformidade: "APROVADO",
        padraoVigenteId: padroes[2]._id,
        padraoVigenteSnapshot: {
          limiteIdeal: 10,
          limiteMaximo: 100,
          vigemDe: new Date("2024-01-01")
        },
        criadoPor: "analista@valemilk.com.br"
      }
    ]);

    console.log(`✅ ${analises.length} análises de teste criadas`);

    console.log("\n🎉 Seed concluído com sucesso!");
    console.log(`
    Produtos: ${produtos.length}
    Padrões: ${padroes.length}
    Análises: ${analises.length}
    `);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro no seed:", error);
    process.exit(1);
  }
}

seed();
