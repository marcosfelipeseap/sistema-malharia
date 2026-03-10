const jwt = require('jsonwebtoken');
const supabase = require('../config/supabaseClient');

const roleLevels = {
    'monitor': 1,
    'coordenador': 2,
    'gestor': 3,
    'admin': 4
};

exports.requireAuth = async (req, res, next) => {
    const token = req.cookies.access_token;

    if (!token) return res.redirect('/auth/login');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Busca o usuário no schema malharia (AGORA INCLUINDO O AVATAR)
        const { data: user, error } = await supabase.schema('malharia')
            .from('usuarios')
            .select('id, nome, username, cargo, status, avatar') // <--- AVATAR ADICIONADO AQUI
            .eq('id', decoded.id)
            .single();

        if (error || !user || user.status !== 'aprovado') {
            res.clearCookie('access_token');
            return res.redirect('/auth/login?error=Conta inativa ou pendente de aprovação.');
        }

        req.user = user;
        req.user.nivel = roleLevels[user.cargo];

        // Se for monitor, precisamos carregar quais malharias ele tem acesso
        if (user.cargo === 'monitor') {
            const { data: vinculos } = await supabase.schema('malharia')
                .from('usuario_malharia')
                .select('malharia_id')
                .eq('usuario_id', user.id);
            req.user.malharias_permitidas = vinculos ? vinculos.map(v => v.malharia_id) : [];
        }

        // Disponibiliza as informações para todas as views EJS (incluindo o avatar)
        res.locals.user = req.user;
        next();
    } catch (err) {
        res.clearCookie('access_token');
        res.redirect('/auth/login');
    }
};

exports.requireRole = (minRole) => {
    return (req, res, next) => {
        if (!req.user) return res.redirect('/auth/login');
        
        const minLevel = roleLevels[minRole];
        if (req.user.nivel < minLevel) {
            // Acesso negado sem alert, renderizamos a home limpa ou redirecionamos
            return res.redirect('/'); 
        }
        next();
    };
};