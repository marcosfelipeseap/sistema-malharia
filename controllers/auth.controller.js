const userService = require('../services/user.service');

/**
 * Renderiza a página de login
 */
exports.getLoginPage = (req, res) => {
    // Verifica se já existe um cookie válido, se sim, redireciona para dashboard
    if (req.cookies.access_token) {
        return res.redirect('/');
    }
    
    // Renderiza a view de login usando um layout limpo (sem navbar/sidebar padrão)
    res.render('auth/login', { 
        layout: false, // Define false para não usar o layout main.ejs
        error: null 
    });
};

/**
 * Processa o login do usuário
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Chama o serviço para autenticar no Supabase
        const { session, user, error } = await userService.authenticateUser(email, password);

        if (error) {
            return res.render('auth/login', { 
                layout: false,
                error: 'Credenciais inválidas. Tente novamente.' 
            });
        }

        // Define o cookie de acesso (HttpOnly para segurança)
        // O tempo de expiração segue a sessão do Supabase (ex: 1 semana ou 1 hora)
        res.cookie('access_token', session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Apenas HTTPS em produção
            maxAge: session.expires_in * 1000 // Converte segundos para ms
        });

        // Login com sucesso, redireciona para a home
        res.redirect('/');

    } catch (err) {
        console.error('Erro no login:', err);
        res.render('auth/login', { 
            layout: false,
            error: 'Ocorreu um erro interno. Tente mais tarde.' 
        });
    }
};

/**
 * Realiza o logout do usuário
 */
exports.logout = async (req, res) => {
    try {
        // Chama o serviço para invalidar a sessão no Supabase (opcional, mas recomendado)
        await userService.signOut();
        
        // Limpa o cookie do navegador
        res.clearCookie('access_token');
        res.redirect('/auth/login');
    } catch (err) {
        console.error('Erro ao fazer logout:', err);
        res.clearCookie('access_token');
        res.redirect('/auth/login');
    }
};