const express = require('express');
const router = express.Router();
const controller = require('../controllers/itens.controller');

// 1. Rota de API (Para criação rápida via modal em outras telas)
// Deve vir antes das rotas com :id para não confundir
router.post('/api', controller.apiStore);

// 2. Rotas Principais (CRUD)
router.get('/', controller.index);           // Lista itens
router.get('/create', controller.create);    // Formulário de criação
router.post('/', controller.store);          // Salva novo item

// 3. Rotas com ID (Edição e Exclusão)
router.get('/:id/edit', controller.edit);    // Formulário de edição
router.post('/:id/update', controller.update); // Salva alterações
router.post('/:id/delete', controller.destroy); // Exclui item

module.exports = router;