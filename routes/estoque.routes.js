const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoque.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware.requireAuth, estoqueController.index);
router.post('/transferir', authMiddleware.requireAuth, estoqueController.transferir);

// Rota para o Monitor arquivar a notificação de histórico
router.post('/arquivar', authMiddleware.requireAuth, estoqueController.arquivar);

// Rotas exclusivas para Gestores e Admins
router.post('/aprovar', authMiddleware.requireRole('gestor'), estoqueController.aprovar);
router.post('/rejeitar', authMiddleware.requireRole('gestor'), estoqueController.rejeitar);

module.exports = router;