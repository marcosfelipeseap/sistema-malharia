const express = require('express');
const router = express.Router();
const processosController = require('../controllers/processos.controller');

// Listagem (Dashboard)
router.get('/', processosController.index);

// Formulário de Criação
router.get('/create', processosController.create);

// Ação de Salvar (Create)
router.post('/', processosController.store);

// Formulário de Edição
router.get('/:id/edit', processosController.edit);

// Ação de Atualizar (Update)
router.post('/:id/update', processosController.update);

// Ação de Excluir (Delete)
router.post('/:id/delete', processosController.destroy);

module.exports = router;