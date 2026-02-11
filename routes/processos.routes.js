const express = require('express');
const router = express.Router();
const processosController = require('../controllers/processos.controller');

// 1. Rotas de API (JSON) - Devem vir primeiro!
router.get('/api/itens', processosController.getItensApi);

// 2. Rota Principal (Dashboard)
router.get('/', processosController.index);

// 3. Rotas Específicas (Criação) - ATENÇÃO: Create ANTES do :id
router.get('/create', processosController.create);
router.post('/', processosController.store);

// 4. Rotas Parametrizadas (:id) - Devem vir por último
router.get('/:id', processosController.show); // Visualizar
router.get('/:id/edit', processosController.edit); // Editar
router.post('/:id/update', processosController.update);
router.post('/:id/delete', processosController.destroy);

module.exports = router;