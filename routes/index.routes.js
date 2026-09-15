const express = require('express');
const router = express.Router();

const { requireAuth, requireMalhariaAccess } = require('../middlewares/auth.middleware'); 

const processosRoutes = require('./processos.routes');
const unidadesRoutes = require('./unidades.routes');
const malhariasRoutes = require('./malharias.routes');
const itensRoutes = require('./itens.routes');
const registrosRoutes = require('./registros.routes');
const maquinariosRoutes = require('./maquinarios.routes');
const estoqueRoutes = require('./estoque.routes'); 
const cortesRoutes = require('./cortes.routes'); 

// Importação das rotas de Impressões
const maquinasImpressaoRoutes = require('./maquinas_impressao.routes');
const impressoesRoutes = require('./impressoes.routes');

// Protegendo as rotas da malharia contra acessos do 'controlador'
router.use('/processos', requireAuth, requireMalhariaAccess, processosRoutes);
router.use('/unidades', requireAuth, requireMalhariaAccess, unidadesRoutes);
router.use('/malharias', requireAuth, requireMalhariaAccess, malhariasRoutes);
router.use('/itens', requireAuth, requireMalhariaAccess, itensRoutes);
router.use('/registros', requireAuth, requireMalhariaAccess, registrosRoutes);
router.use('/maquinarios', requireAuth, requireMalhariaAccess, maquinariosRoutes);
router.use('/estoque', requireAuth, requireMalhariaAccess, estoqueRoutes); 
router.use('/cortes', requireAuth, requireMalhariaAccess, cortesRoutes); 

// Rotas de Impressões (Ambiente Insumos)
// Usamos APENAS o requireAuth para que a equipe de insumos (controlador) consiga acessar,
// pois o requireMalhariaAccess bloquearia o acesso deles.
router.use('/maquinas-impressao', requireAuth, maquinasImpressaoRoutes);
router.use('/impressoes', requireAuth, impressoesRoutes);

// Rota Principal
router.get('/', requireAuth, (req, res) => {
    // Se quem logou for controlador, jogamos direto pro ambiente dele
    if (req.user.cargo === 'controlador') {
        return res.redirect('/insumos');
    }
    // Caso contrário, vai pro fluxo normal
    res.redirect('/registros');
});

module.exports = router;