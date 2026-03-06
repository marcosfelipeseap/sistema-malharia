const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middlewares/auth.middleware'); 

const processosRoutes = require('./processos.routes');
const unidadesRoutes = require('./unidades.routes');
const malhariasRoutes = require('./malharias.routes');
const itensRoutes = require('./itens.routes');
const registrosRoutes = require('./registros.routes');
const maquinariosRoutes = require('./maquinarios.routes');
const estoqueRoutes = require('./estoque.routes'); // <--- IMPORTAÇÃO DO ESTOQUE

router.use('/processos', requireAuth, processosRoutes);
router.use('/unidades', requireAuth, unidadesRoutes);
router.use('/malharias', requireAuth, malhariasRoutes);
router.use('/itens', requireAuth, itensRoutes);
router.use('/registros', requireAuth, registrosRoutes);
router.use('/maquinarios', requireAuth, maquinariosRoutes);
router.use('/estoque', requireAuth, estoqueRoutes); // <--- ATIVAÇÃO DA ROTA DE ESTOQUE

// CORREÇÃO: Redireciona para registros em vez de processos
router.get('/', (req, res) => {
    res.redirect('/registros');
});

module.exports = router;