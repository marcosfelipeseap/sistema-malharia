const express = require('express');
const router = express.Router();
const itensController = require('../controllers/itens.controller');

// Rota API para criação via Modal (AJAX) - ADICIONE ESTA LINHA
router.post('/api', itensController.apiStore);

// Rotas Padrão
router.get('/', itensController.index);
router.get('/create', itensController.create);
router.post('/', itensController.store);
router.get('/:id/edit', itensController.edit);
router.post('/:id', itensController.update);
router.post('/:id/delete', itensController.destroy);

module.exports = router;