import { Router } from "express";
import { analisesController } from "../controllers/AnalisesController";

const router = Router();

/**
 * POST /api/analises
 * Criar nova análise
 */
router.post("/", (req, res) => analisesController.criar(req, res));

/**
 * GET /api/analises
 * Listar com filtros e paginação
 */
router.get("/", (req, res) => analisesController.listar(req, res));

/**
 * GET /api/analises/pendentes/listar
 * Listar análises com atraso de leitura
 */
router.get("/pendentes/listar", (req, res) => analisesController.listarPendentes(req, res));

/**
 * POST /api/analises/auditoria/datas-suspeitas
 * Marcar análises muito antigas para auditoria
 */
router.post("/auditoria/datas-suspeitas", (req, res) => analisesController.auditarDatas(req, res));

/**
 * GET /api/analises/:id
 * Obter detalhe com auditoria
 */
router.get("/:id", (req, res) => analisesController.obter(req, res));

/**
 * PATCH /api/analises/:id
 * Atualizar análise (resultado/datas)
 */
router.patch("/:id", (req, res) => analisesController.atualizar(req, res));

export default router;
