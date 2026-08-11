import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { autenticarJWT } from "../middleware/autenticacao";

const router = Router();
const controller = new AuthController();

// POST /api/auth/login — Sem autenticação
router.post("/login", (req, res) => controller.login(req, res));

// GET /api/auth/me — Com autenticação
router.get("/me", autenticarJWT, (req, res) => controller.me(req, res));

export default router;
