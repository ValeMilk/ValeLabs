import mongoose from "mongoose";

export async function connectMongoDB() {
  const mongoUri = process.env.MONGO_URI;
  
  if (!mongoUri) {
    throw new Error("MONGO_URI não está definida no .env");
  }
  
  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB_NAME || "valelabs_microbio"
    });
    console.log("✅ Conectado ao MongoDB Atlas");
  } catch (error) {
    console.error("❌ Erro ao conectar MongoDB:", error);
    process.exit(1);
  }
}

export async function disconnectMongoDB() {
  await mongoose.disconnect();
  console.log("✅ Desconectado do MongoDB");
}
