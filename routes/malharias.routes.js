const express = require('express');
const router = express.Router();
const malhariasController = require('../controllers/malharias.controller');

// 1. Rotas Gerais e Específicas (DEVEM vir primeiro)
router.get('/', malhariasController.index);
router.get('/create', malhariasController.create); // <-- O Create deve vir antes de qualquer /:id
router.post('/', malhariasController.store);

// 2. Rotas que dependem de ID (DEVEM vir depois)
// O Express lê de cima para baixo. Se /:id estiver em cima, ele acha que "create" é um ID.
router.get('/:id/edit', malhariasController.edit);
router.post('/:id/update', malhariasController.update);
router.post('/:id/delete', malhariasController.destroy);

module.exports = router;