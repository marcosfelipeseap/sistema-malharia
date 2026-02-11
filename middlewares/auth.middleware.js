/**
 * VERSÃO SEM LOGIN (BYPASS)
 * Este middleware simula um usuário logado para testes.
 */

exports.requireAuth = async (req, res, next) => {
    // Simula um usuário fictício
    req.user = {
        id: null, // Define como null para não dar erro de chave estrangeira (se a coluna permitir)
        email: 'modo_dev@teste.com'
    };

    // Passa direto sem verificar cookies ou Supabase
    next();
};

exports.requireAdmin = async (req, res, next) => {
    next();
};