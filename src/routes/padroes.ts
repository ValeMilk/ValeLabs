import { Router } from "express";
import { padroesController } from "../controllers/PadroesController";

const router = Router();

/**
 * POST /api/padroes
 * Criar novo padrão (ADMIN)
 */
router.post("/", (req, res) => padroesController.criar(req, res));

/**
 * GET /api/padroes
 * Listar padrões vigentes
 */
router.get("/", (req, res) => padroesController.listarVigentes(req, res));

/**
 * GET /api/padroes/contagem/unicos
 * Contar padrões únicos
 */
router.get("/contagem/unicos", (req, res) => padroesController.contarUnicos(req, res));

/**
 * GET /api/padroes/historico/:categoria/:microrganismo
 * Ver versões antigas de um padrão
 */
router.get("/historico/:categoria/:microrganismo", (req, res) => padroesController.listarHistorico(req, res));

/**
 * GET /api/padroes/:id
 * Obter padrão por ID
 */
router.get("/:id", (req, res) => padroesController.obter(req, res));

export default router;
