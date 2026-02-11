const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth.middleware');

// Importação das rotas
const processosRoutes = require('./processos.routes');
const unidadesRoutes = require('./unidades.routes');
const malhariasRoutes = require('./malharias.routes');
const itensRoutes = require('./itens.routes');
const registrosRoutes = require('./registros.routes');
const authRoutes = require('./auth.routes');

// Rotas Públicas (Login/Logout) - Mantidas caso queira voltar depois
router.use('/auth', authRoutes);

// Rotas do Sistema (Agora o requireAuth deixa passar tudo)
router.use('/processos', requireAuth, processosRoutes);
router.use('/unidades', requireAuth, unidadesRoutes);
router.use('/malharias', requireAuth, malhariasRoutes);
router.use('/itens', requireAuth, itensRoutes);
router.use('/registros', requireAuth, registrosRoutes);

// Rota Raiz - Redireciona direto para o Dashboard
router.get('/', (req, res) => {
    res.redirect('/processos');
});

module.exports = router;