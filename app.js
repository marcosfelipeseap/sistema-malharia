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

// 👇 AQUI ESTÁ A CORREÇÃO: Limites aumentados para 10mb para permitir fotos Base64
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true })); 

app.use(cookieParser()); // Parser para cookies (auth)

// Importação das Rotas
const indexRoutes = require('./routes/index.routes');
const authRoutes = require('./routes/auth.routes');         
const usuariosRoutes = require('./routes/usuarios.routes'); 

// Definição das Rotas (A ORDEM AQUI IMPORTA)
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/', indexRoutes);

// Tratamento de Erro 404 (Página não encontrada)
app.use((req, res, next) => {
    res.status(404).render('partials/alerts', {
        layout: false, 
        message: 'Página não encontrada',
        type: 'danger'
    });
});

// Exporta o app para ser usado no server.js
module.exports = app;