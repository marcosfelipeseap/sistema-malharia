const express = require('express');
const router = express.Router();
const { requireAuth, requireInsumosAccess } = require('../middlewares/auth.middleware');

// Trava geral: Requer estar logado E não ser monitor
router.use(requireAuth, requireInsumosAccess);

// Dashboard Principal dos Insumos
router.get('/', (req, res) => {
    res.render('insumos/index', {
        title: 'Controle de Insumos'
    });
});

module.exports = router;