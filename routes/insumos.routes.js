const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth, requireInsumosAccess } = require('../middlewares/auth.middleware');
const InsumosController = require('../controllers/insumos.controller');

// Configuração do Multer para processar arquivos em memória
const upload = multer({ storage: multer.memoryStorage() });

// Middleware de autenticação
router.use(requireAuth, requireInsumosAccess);

// Rotas do Módulo de Insumos
router.get('/', InsumosController.index);

// Rotas de listagem e criação de produtos base
router.get('/:malharia_id/:categoria', InsumosController.listarEstoque);
router.post('/:malharia_id/:categoria/novo', InsumosController.criarProduto);

// Rotas de detalhes e adição de movimentações
router.get('/:malharia_id/:categoria/:insumo_id', InsumosController.detalhesProduto);
router.post('/:malharia_id/:categoria/:insumo_id/movimentar', 
    upload.fields([
        { name: 'nota_fiscal', maxCount: 1 }, 
        { name: 'comprovante', maxCount: 1 }
    ]), 
    InsumosController.adicionarEntrada
);

// --- ROTAS DE EDIÇÃO E EXCLUSÃO ---

// Produtos Principais
router.post('/:malharia_id/:categoria/:insumo_id/editar', InsumosController.editarProduto);
router.post('/:malharia_id/:categoria/:insumo_id/excluir', InsumosController.excluirProduto);

// Lançamentos / Movimentações
router.post('/:malharia_id/:categoria/:insumo_id/movimentacao/:movimentacao_id/editar', 
    upload.fields([{ name: 'nota_fiscal', maxCount: 1 }, { name: 'comprovante', maxCount: 1 }]), 
    InsumosController.editarEntrada
);
router.post('/:malharia_id/:categoria/:insumo_id/movimentacao/:movimentacao_id/excluir', InsumosController.excluirEntrada);

module.exports = router;