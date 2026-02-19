const express = require('express');
const router = express.Router();
const registrosController = require('../controllers/registros.controller');

router.get('/', registrosController.index);
router.get('/create', registrosController.create);
router.post('/', registrosController.store);
router.post('/:id/delete', registrosController.destroy);

// Novas rotas AJAX para a tela de apontamento
router.get('/api/malharia-info/:id', registrosController.getMalhariaInfo);
router.get('/api/sugestoes/:malharia_id', registrosController.getSugestoes);

// Adicione estas duas linhas
router.get('/:id/edit', registrosController.edit);
router.post('/:id/update', registrosController.update);

module.exports = router;