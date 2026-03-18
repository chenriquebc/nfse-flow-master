const { Router } = require("express");
const authMiddleware = require("../middleware/auth");
const nfeController = require("../controllers/nfe");

const router = Router();

// Todas as rotas exigem autenticação
router.use(authMiddleware);

// POST /nfe/emitir - Emissão completa de NF-e
router.post("/emitir", nfeController.emitir);

// POST /nfe/status - Status do serviço SEFAZ
router.post("/status", nfeController.status);

// GET /nfe/:chave - Consulta NF-e por chave de acesso
router.get("/:chave", nfeController.consultar);

// POST /nfe/cancelar - Cancelamento de NF-e
router.post("/cancelar", nfeController.cancelar);

module.exports = router;
