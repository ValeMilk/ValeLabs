import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import { Usuario } from "./src/models";

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "", {
      dbName: process.env.MONGO_DB_NAME || "valelabs_microbio"
    });

    console.log("🔧 Criando usuário de teste...");

    // Deletar se já existe
    await Usuario.deleteOne({ email: "teste@valelabs.com" });

    // Hash da senha
    const senhaHash = await bcryptjs.hash("Teste@123", 10);

    // Criar usuário
    const usuario = new Usuario({
      email: "teste@valelabs.com",
      senha: senhaHash,
      nome: "Usuário Teste",
      perfis: ["analista"]
    });

    await usuario.save();

    console.log("✅ Usuário criado com sucesso!");
    console.log("📧 Email: teste@valelabs.com");
    console.log("🔑 Senha: Teste@123");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }
}

createTestUser();
