const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const supabase = require('./config/supabaseClient'); 
const rankingService = require('./services/ranking.service');

const app = express();

// 1. ARQUIVOS ESTÁTICOS PRIMEIRO DE TUDO (Antes de qualquer middleware ou layout!)
// Assim as imagens carregam instantaneamente sem passar por EJS, Cookies ou Supabase
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d' // Cache de 1 dia no navegador para imagens e CSS não recarregarem toda hora
}));

app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true })); 
app.use(cookieParser());

// Cache simples em memória RAM (Sem NodeCache para não clonar objetos e não travar a CPU)
let globalHeaderCache = {
    data: { pendingCount: 0, aprovadasCount: 0, rejeitadasCount: 0, top5: [] },
    lastFetch: 0,
    isFetching: false
};

async function atualizarContadoresEmBackground() {
    if (globalHeaderCache.isFetching) return;
    globalHeaderCache.isFetching = true;

    try {
        const tresDiasAtras = new Date();
        tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
        const isoDate = tresDiasAtras.toISOString();
        const dataAtual = new Date();

        // Executa todas em paralelo em vez de esperar uma por uma (4x mais rápido)
        const [resPend, resAprov, resRej, rankingCompleto] = await Promise.all([
            supabase.schema('malharia').from('solicitacoes_insumos').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
            supabase.schema('malharia').from('solicitacoes_insumos').select('*', { count: 'exact', head: true }).eq('status', 'aprovada').gte('updated_at', isoDate),
            supabase.schema('malharia').from('solicitacoes_insumos').select('*', { count: 'exact', head: true }).eq('status', 'rejeitada').gte('updated_at', isoDate),
            rankingService.getRankingPerformance(dataAtual.getMonth() + 1, dataAtual.getFullYear()).catch(() => [])
        ]);

        globalHeaderCache.data = {
            pendingCount: resPend.count || 0,
            aprovadasCount: resAprov.count || 0,
            rejeitadasCount: resRej.count || 0,
            top5: Array.isArray(rankingCompleto) ? rankingCompleto.slice(0, 5) : []
        };
        globalHeaderCache.lastFetch = Date.now();
    } catch (e) {
        console.error("Erro ao atualizar contadores globais:", e.message);
    } finally {
        globalHeaderCache.isFetching = false;
    }
}

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    res.locals.query = req.query; 
    
    if (req.path.startsWith('/insumos') || 
        req.path.startsWith('/impressoes') || 
        req.path.startsWith('/maquinas-impressao') || 
        req.path.startsWith('/tintas-bobinas') || 
        (req.query && req.query.env === 'insumos')) {
        res.locals.currentEnv = 'insumos';
    } else {
        res.locals.currentEnv = 'malharia';
    }

    // Não faz consultas pesadas na rota do dashboard público (que usa layout public e não precisa de notificações internas)
    if (Date.now() - globalHeaderCache.lastFetch > 180000) { // Atualiza a cada 3 minutos em segundo plano!
        atualizarContadoresEmBackground(); // NÃO usa await! A página abre na hora sem esperar o banco!
    }

    res.locals.pendingSolicitacoesCount = globalHeaderCache.data.pendingCount;
    res.locals.recentAprovadasCount = globalHeaderCache.data.aprovadasCount;
    res.locals.recentRejeitadasCount = globalHeaderCache.data.rejeitadasCount;
    res.locals.top5Ranking = globalHeaderCache.data.top5;
    
    next();
});

const authRoutes = require('./routes/auth.routes');           
const usuariosRoutes = require('./routes/usuarios.routes'); 
const insumosRoutes = require('./routes/insumos.routes');
const solicitacoesRoutes = require('./routes/solicitacoes.routes'); 
const suporteRoutes = require('./routes/suporte.routes'); 
const indexRoutes = require('./routes/index.routes');

app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/insumos', insumosRoutes);
app.use('/solicitacoes', solicitacoesRoutes); 
app.use('/suporte', suporteRoutes);
app.use('/', indexRoutes);

app.use((req, res) => {
    res.status(404).render('partials/alerts', {
        layout: false, 
        message: 'Página não encontrada',
        type: 'danger'
    });
});

module.exports = app;