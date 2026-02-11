const supabase = require('../config/supabaseClient');

/**
 * Serviço responsável pela lógica de autenticação de usuários
 */
exports.authenticateUser = async (email, password) => {
    try {
        // Tenta realizar o login usando a API de Auth do Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        return { session: data.session, user: data.user, error: null };
    } catch (error) {
        console.error('Erro no serviço de autenticação:', error.message);
        return { session: null, user: null, error: error.message };
    }
};

exports.signOut = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Erro ao deslogar:', error.message);
    }
};