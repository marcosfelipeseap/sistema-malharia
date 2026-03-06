const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoque.controller');

// A raiz '/' aqui já representa '/estoque' lá no index.routes.js
router.get('/', estoqueController.index);

module.exports = router;