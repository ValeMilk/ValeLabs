import { Router } from "express";
import { DashboardController } from "../controllers/DashboardController";

const router = Router();
const controller = new DashboardController();

// GET /api/dashboard/categorias — Resumo por categoria
router.get("/categorias", (req, res) => controller.obterCategorias(req, res));

// GET /api/dashboard/categoria/:categoria — Detalhes de uma categoria
router.get("/categoria/:categoria", (req, res) => controller.obterCategoria(req, res));

// GET /api/dashboard/produto/:produtoId — Análises de um produto
router.get("/produto/:produtoId", (req, res) => controller.obterProduto(req, res));

// GET /api/dashboard/tendencia/categoria/:categoria — Tendência temporal
router.get("/tendencia/categoria/:categoria", (req, res) => controller.obterTendenciaCategoria(req, res));

export default router;
