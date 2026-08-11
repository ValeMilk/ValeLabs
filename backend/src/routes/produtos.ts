import { Router } from "express";
import { ProdutosController } from "../controllers/ProdutosController";

const router = Router();
const controller = new ProdutosController();

// GET /api/produtos — Listar todos
router.get("/", (req, res) => controller.listar(req, res));

// GET /api/produtos/:id — Obter um
router.get("/:id", (req, res) => controller.obter(req, res));

// POST /api/produtos — Criar novo
router.post("/", (req, res) => controller.criar(req, res));

export default router;
