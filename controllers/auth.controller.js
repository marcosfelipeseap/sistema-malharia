const userService = require('../services/user.service');
const jwt = require('jsonwebtoken');

exports.getLoginPage = (req, res) => {
    if (req.cookies.access_token) return res.redirect('/');
    res.render('auth/login', { 
        layout: false, 
        error: req.query.error || null,
        success: null
    });
};

exports.getRegisterPage = (req, res) => {
    if (req.cookies.access_token) return res.redirect('/');
    res.render('auth/register', { 
        layout: false, 
        error: null 
    });
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const { user, error } = await userService.authenticate(username, password);

        if (error) {
            return res.render('auth/login', { layout: false, error, success: null });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '12h' }
        );

        res.cookie('access_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 12 * 60 * 60 * 1000 // 12 horas
        });

        res.redirect('/');
    } catch (err) {
        console.error('Erro no login:', err);
        res.render('auth/login', { layout: false, error: 'Erro interno.', success: null });
    }
};

exports.register = async (req, res) => {
    try {
        const { nome, username, password } = req.body;

        // Validação back-end para o username
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return res.render('auth/register', { layout: false, error: 'Usuário inválido. Use apenas letras, números e underline.' });
        }

        const { error } = await userService.register(nome, username, password);

        if (error) {
            return res.render('auth/register', { layout: false, error });
        }

        res.render('auth/login', { 
            layout: false, 
            success: 'Cadastro realizado! Aguarde um Gestor ou Administrador aprovar e definir seu cargo para acessar o sistema.',
            error: null
        });
    } catch (err) {
        res.render('auth/register', { layout: false, error: 'Erro ao registrar.' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('access_token');
    res.redirect('/auth/login');
};