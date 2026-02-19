const express = require('express');
const router = express.Router();
const registrosController = require('../controllers/registros.controller');

router.get('/', registrosController.index);
router.get('/create', registrosController.create);
router.post('/', registrosController.store);
router.post('/:id/delete', registrosController.destroy);

// Novas rotas para Feriados e Folgas
router.post('/feriados', registrosController.storeFeriado);
router.post('/feriados/:id/delete', registrosController.destroyFeriado);

// Rotas da API e Edição
router.get('/api/malharia-info/:id', registrosController.getMalhariaInfo);
router.get('/:id/edit', registrosController.edit);
router.post('/:id/update', registrosController.update);

module.exports = router;