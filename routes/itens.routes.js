const express = require('express');
const router = express.Router();
const itensController = require('../controllers/itens.controller');

// Rotas CRUD para Itens (Matéria-prima e Produtos Finais)
router.get('/', itensController.index);
router.get('/create', itensController.create);
router.post('/', itensController.store);
router.get('/:id/edit', itensController.edit);
router.post('/:id/update', itensController.update);
router.post('/:id/delete', itensController.destroy);

module.exports = router;