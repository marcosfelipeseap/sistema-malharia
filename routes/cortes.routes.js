const express = require('express');
const router = express.Router();
const cortesController = require('../controllers/cortes.controller');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Rotas de ENTRADA de Cortes (Envio da Sede para Oficina)
router.get('/', cortesController.index);
router.post('/store', upload.single('documento_comprovante'), cortesController.store);
router.post('/:id/update', upload.single('documento_comprovante'), cortesController.update);
router.post('/:id/delete', cortesController.destroy);

// Rotas de CONSUMO / BAIXA (Na Produção)
router.get('/consumo', cortesController.consumo);
router.post('/consumo/sync', cortesController.syncConsumo); // ROTA DO AUTO-PREENCHIMENTO
router.post('/consumo/store', cortesController.storeBaixa);
router.post('/consumo/:id/update', cortesController.updateBaixa); // ROTA DE EDIÇÃO
router.post('/consumo/:id/aprovar', cortesController.aprovarBaixa);
router.post('/consumo/:id/rejeitar', cortesController.rejeitarBaixa);
router.post('/consumo/:id/delete', cortesController.destroyBaixa);

module.exports = router;