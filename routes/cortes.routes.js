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

module.exports = router;