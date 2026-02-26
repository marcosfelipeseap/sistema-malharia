const supabase = require('../config/supabaseClient');
const bcrypt = require('bcryptjs');

exports.register = async (nome, username, senha) => {
    // Verifica se username já existe
    const { data: existente } = await supabase.schema('malharia')
        .from('usuarios')
        .select('id')
        .eq('username', username)
        .single();

    if (existente) return { error: 'Nome de usuário já está em uso.' };

    const salt = await bcrypt.genSalt(10);
    const hashSenha = await bcrypt.hash(senha, salt);

    const { data, error } = await supabase.schema('malharia')
        .from('usuarios')
        .insert([{
            nome,
            username,
            senha: hashSenha,
            status: 'pendente' // Aguardando aprovação
        }])
        .select()
        .single();

    return { user: data, error: error?.message };
};

exports.authenticate = async (username, senha) => {
    const { data: user, error } = await supabase.schema('malharia')
        .from('usuarios')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !user) return { error: 'Usuário não encontrado.' };
    if (user.status !== 'aprovado') return { error: 'Sua conta ainda não foi aprovada por um Gestor ou Admin.' };

    const isMatch = await bcrypt.compare(senha, user.senha);
    if (!isMatch) return { error: 'Senha incorreta.' };

    return { user };
};