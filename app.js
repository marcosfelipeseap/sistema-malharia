const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

// Inicializa o app Express
const app = express();

// Configuração do View Engine (EJS)
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main'); // Define o layout padrão

// Configuração de Arquivos Estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middlewares Essenciais
app.use(morgan('dev')); // Log de requisições
app.use(express.json()); // Parser para JSON
app.use(express.urlencoded({ extended: true })); // Parser para dados de formulário
app.use(cookieParser()); // Parser para cookies (auth)

// Importação das Rotas Principais
const indexRoutes = require('./routes/index.routes');

// Definição das Rotas
app.use('/', indexRoutes);

// Tratamento de Erro 404 (Página não encontrada)
app.use((req, res, next) => {
    res.status(404).render('partials/alerts', {
        layout: false, // Renderiza sem layout completo ou redireciona
        message: 'Página não encontrada',
        type: 'danger'
    });
    // Alternativamente, poderia renderizar uma view específica 404.ejs
});

// Exporta o app para ser usado no server.js
module.exports = app;