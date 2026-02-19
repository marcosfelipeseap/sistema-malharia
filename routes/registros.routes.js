const express = require('express');
const router = express.Router();
const registrosController = require('../controllers/registros.controller');

router.get('/', registrosController.index);
router.get('/create', registrosController.create);
router.post('/', registrosController.store);
router.post('/:id/delete', registrosController.destroy);

// Rota AJAX para a tela de apontamento
router.get('/api/malharia-info/:id', registrosController.getMalhariaInfo);

// Rotas de edição
router.get('/:id/edit', registrosController.edit);
router.post('/:id/update', registrosController.update);

module.exports = router;