const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const NodeCache = require('node-cache');
const supabase = require('./config/supabaseClient'); 

// Importação do Serviço de Ranking para o Pódio Global
const rankingService = require('./services/ranking.service');

const app = express();

// Inicializa o cache de 2 minutos para aliviar o banco nas requisições globais
const appCache = new NodeCache({ stdTTL: 120 });

app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true })); 
app.use(cookieParser());

app.use(async (req, res, next) => {
    res.locals.currentPath = req.path;
    res.locals.query = req.query; 
    
    // Regra do ambiente Insumos
    if (req.path.startsWith('/insumos') || 
        req.path.startsWith('/impressoes') || 
        req.path.startsWith('/maquinas-impressao') || 
        req.path.startsWith('/tintas-bobinas') || 
        (req.query && req.query.env === 'insumos')) {
        res.locals.currentEnv = 'insumos';
    } else {
        res.locals.currentEnv = 'malharia';
    }

    // IGNORA consultas ao banco para ficheiros estáticos (imagens, folhas de estilo, scripts)
    if (req.path.match(/\.(png|jpg|jpeg|gif|css|js|ico|svg|webp)$/i)) {
        return next();
    }

    try {
        let cachedCounters = appCache.get('GLOBAL_COUNTERS');
        
        if (!cachedCounters) {
            const { count: countPendentes } = await supabase.schema('malharia')
                .from('solicitacoes_insumos')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pendente');

            const tresDiasAtras = new Date();
            tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
            const isoDate = tresDiasAtras.toISOString();

            const { count: countAprovadas } = await supabase.schema('malharia')
                .from('solicitacoes_insumos')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'aprovada')
                .gte('updated_at', isoDate);

            const { count: countRejeitadas } = await supabase.schema('malharia')
                .from('solicitacoes_insumos')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'rejeitada')
                .gte('updated_at', isoDate);

            const dataAtual = new Date();
            const rankingCompleto = await rankingService.getRankingPerformance(dataAtual.getMonth() + 1, dataAtual.getFullYear());

            cachedCounters = {
                pendingCount: countPendentes || 0,
                aprovadasCount: countAprovadas || 0,
                rejeitadasCount: countRejeitadas || 0,
                top5: rankingCompleto.slice(0, 5)
            };

            appCache.set('GLOBAL_COUNTERS', cachedCounters);
        }

        res.locals.pendingSolicitacoesCount = cachedCounters.pendingCount;
        res.locals.recentAprovadasCount = cachedCounters.aprovadasCount;
        res.locals.recentRejeitadasCount = cachedCounters.rejeitadasCount;
        res.locals.top5Ranking = cachedCounters.top5;

    } catch (e) {
        console.error("Erro no middleware global:", e);
        res.locals.pendingSolicitacoesCount = 0;
        res.locals.recentAprovadasCount = 0;
        res.locals.recentRejeitadasCount = 0;
        res.locals.top5Ranking = [];
    }
    
    next();
});

// Importações corretas de rotas sem duplicidade
const authRoutes = require('./routes/auth.routes');           
const usuariosRoutes = require('./routes/usuarios.routes'); 
const insumosRoutes = require('./routes/insumos.routes');
const solicitacoesRoutes = require('./routes/solicitacoes.routes'); 
const suporteRoutes = require('./routes/suporte.routes'); 
const indexRoutes = require('./routes/index.routes');

// Montagem das rotas independentes
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/insumos', insumosRoutes);
app.use('/solicitacoes', solicitacoesRoutes); 
app.use('/suporte', suporteRoutes);

// A rota raiz DEVE ser a última. Ela carrega a proteção de todas as rotas
app.use('/', indexRoutes);

app.use((req, res, next) => {
    res.status(404).render('partials/alerts', {
        layout: false, 
        message: 'Página não encontrada',
        type: 'danger'
    });
});

module.exports = app;