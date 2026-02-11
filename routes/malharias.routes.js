const express = require('express');
const router = express.Router();
const malhariasController = require('../controllers/malharias.controller');

// Rotas CRUD para Malharias (Setores/Fábricas dentro de unidades)
router.get('/', malhariasController.index);
router.get('/create', malhariasController.create);
router.post('/', malhariasController.store);
router.get('/:id/edit', malhariasController.edit);
router.post('/:id/update', malhariasController.update);
router.post('/:id/delete', malhariasController.destroy);

module.exports = router;