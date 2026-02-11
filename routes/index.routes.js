const express = require('express');
const router = express.Router();

// Middlewares
const { requireAuth } = require('../middlewares/auth.middleware'); // Mantido bypass

// Importação das rotas
const processosRoutes = require('./processos.routes');
const unidadesRoutes = require('./unidades.routes');
const malhariasRoutes = require('./malharias.routes');
const itensRoutes = require('./itens.routes');
const registrosRoutes = require('./registros.routes');

// Rotas do Sistema
router.use('/processos', requireAuth, processosRoutes);
router.use('/unidades', requireAuth, unidadesRoutes);
router.use('/malharias', requireAuth, malhariasRoutes);
router.use('/itens', requireAuth, itensRoutes);
router.use('/registros', requireAuth, registrosRoutes);

// Rota Raiz
router.get('/', (req, res) => {
    res.redirect('/processos');
});

module.exports = router;