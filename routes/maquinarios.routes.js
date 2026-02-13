const express = require('express');
const router = express.Router();
const controller = require('../controllers/maquinarios.controller');

// Rotas de Tipos 
router.get('/tipos', controller.indexTipos);
router.post('/tipos', controller.storeTipo);
router.post('/tipos/:id/update', controller.updateTipo); // <--- NOVA ROTA
router.post('/tipos/:id/delete', controller.destroyTipo);

// Rotas de Máquinas
router.get('/', controller.index);
router.get('/create', controller.create);
router.post('/', controller.store);
router.get('/:id/edit', controller.edit);
router.post('/:id/update', controller.update);
router.post('/:id/delete', controller.destroy);

module.exports = router;