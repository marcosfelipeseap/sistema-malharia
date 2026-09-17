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

// Importação das rotas de Insumos / Impressões
const maquinasImpressaoRoutes = require('./maquinas_impressao.routes');
const impressoesRoutes = require('./impressoes.routes');
const tintasBobinasRoutes = require('./tintas_bobinas.routes'); 

// Importação da Rota de Gamificação (Ranking)
const rankingRoutes = require('./ranking.routes');

// Protegendo as rotas da malharia contra acessos do 'controlador'
router.use('/processos', requireAuth, requireMalhariaAccess, processosRoutes);
router.use('/unidades', requireAuth, requireMalhariaAccess, unidadesRoutes);
router.use('/malharias', requireAuth, requireMalhariaAccess, malhariasRoutes);
router.use('/itens', requireAuth, requireMalhariaAccess, itensRoutes);
router.use('/registros', requireAuth, requireMalhariaAccess, registrosRoutes);
router.use('/maquinarios', requireAuth, requireMalhariaAccess, maquinariosRoutes);
router.use('/estoque', requireAuth, requireMalhariaAccess, estoqueRoutes); 
router.use('/cortes', requireAuth, requireMalhariaAccess, cortesRoutes); 

// Rota de Gamificação (Acesso global autenticado)
router.use('/ranking', requireAuth, rankingRoutes);

// Rotas do Ambiente de Insumos
// Usamos APENAS o requireAuth para que a equipe de insumos (controlador) consiga acessar.
router.use('/maquinas-impressao', requireAuth, maquinasImpressaoRoutes);
router.use('/impressoes', requireAuth, impressoesRoutes);
router.use('/tintas-bobinas', requireAuth, tintasBobinasRoutes); 

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