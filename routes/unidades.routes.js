const express = require('express');
const router = express.Router();
const unidadesController = require('../controllers/unidades.controller');

// Rotas CRUD para Unidades
router.get('/', unidadesController.index);
router.get('/create', unidadesController.create);
router.post('/', unidadesController.store);
router.get('/:id/edit', unidadesController.edit);
router.post('/:id/update', unidadesController.update);
router.post('/:id/delete', unidadesController.destroy);

module.exports = router;