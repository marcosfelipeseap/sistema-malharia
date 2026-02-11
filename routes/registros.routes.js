const express = require('express');
const router = express.Router();
const registrosController = require('../controllers/registros.controller');

// Rotas para Registro Diário (Apontamento de Produção)
router.get('/', registrosController.index);
router.get('/create', registrosController.create);
router.post('/', registrosController.store);

// Exclusão (Geralmente registros de produção não se editam facilmente por auditoria, mas permite exclusão se erro)
router.post('/:id/delete', registrosController.destroy);

module.exports = router;