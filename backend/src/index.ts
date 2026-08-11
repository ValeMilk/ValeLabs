import dotenv from "dotenv";
dotenv.config();

import express, { Express } from "express";
import cors from "cors";
import { connectMongoDB } from "./config/database";
import { autenticarJWT } from "./middleware/autenticacao";
import analisesRouter from "./routes/analises";
import padroesRouter from "./routes/padroes";
import produtosRouter from "./routes/produtos";
import authRouter from "./routes/auth";
import seedRouter from "./routes/seed";
import dashboardRouter from "./routes/dashboard";

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRouter);  // Sem autenticação (login é aqui)
app.use("/api/auth", seedRouter);  // Sem autenticação (seed é aqui)
app.use("/api/produtos", produtosRouter);  // Com autenticação
app.use("/api/dashboard", autenticarJWT, dashboardRouter);  // Com autenticação
app.use("/api/analises", autenticarJWT, analisesRouter);
app.use("/api/padroes", autenticarJWT, padroesRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Erro:", err.message);
  res.status(err.status || 500).json({
    sucesso: false,
    erro: err.message || "Erro interno do servidor"
  });
});

// Start server
async function start() {
  try {
    await connectMongoDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Falha ao iniciar:", error);
    process.exit(1);
  }
}

start();

export default app;
