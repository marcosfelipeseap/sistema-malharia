const express = require('express');
const router = express.Router();
const processosController = require('../controllers/processos.controller');
const multer = require('multer');

// Configuração do Multer (Armazenamento em memória para envio ao Supabase)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. Rotas de API
router.get('/api/itens', processosController.getItensApi);

// 2. Rota Principal
router.get('/', processosController.index);

// 3. Rotas de Criação
router.get('/create', processosController.create);
router.post('/', processosController.store);

// 4. Rotas de Termos de Entrega (NOVAS)
// Upload de termo (PDF)
router.post('/:id/termos', upload.single('arquivo_pdf'), processosController.storeTermo);
// Exclusão de termo
router.post('/:id/termos/:termo_id/delete', processosController.destroyTermo);

// 5. Rotas Parametrizadas
router.get('/:id', processosController.show);
router.get('/:id/edit', processosController.edit);
router.post('/:id/update', processosController.update);
router.post('/:id/delete', processosController.destroy);

module.exports = router;