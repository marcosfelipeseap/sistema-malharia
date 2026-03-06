const supabase = require('../config/supabaseClient');
const bcrypt = require('bcryptjs');

// ==========================================
// ROTAS DO PERFIL (Para todos os logados)
// ==========================================

exports.getPerfil = async (req, res) => {
    res.render('usuarios/perfil', { error: null, success: null });
};

exports.updatePerfil = async (req, res) => {
    try {
        const { nome, username, senha } = req.body;
        const updates = { nome, username };

        // Se o usuário preencheu o campo de senha, vamos atualizá-la
        if (senha && senha.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            updates.senha = await bcrypt.hash(senha, salt);
        }

        const { error } = await supabase.schema('malharia')
            .from('usuarios')
            .update(updates)
            .eq('id', req.user.id);

        if (error) throw error;

        // Se o usuário mudou o username ou a senha, forçamos o login novamente por segurança
        if ((senha && senha.trim() !== '') || username !== req.user.username) {
            return res.redirect('/auth/logout');
        }

        // Atualiza a informação local da sessão
        req.user.nome = nome;
        req.user.username = username;

        res.render('usuarios/perfil', { error: null, success: 'Perfil atualizado com sucesso!' });
    } catch (err) {
        console.error(err);
        res.render('usuarios/perfil', { error: 'Erro ao atualizar o perfil.', success: null });
    }
};

// ==========================================
// ROTAS DE GESTÃO (Apenas Gestor e Admin)
// ==========================================

exports.index = async (req, res) => {
    try {
        // 1. Busca todos os usuários
        const { data: usuarios, error: errUser } = await supabase.schema('malharia')
            .from('usuarios')
            .select('*')
            .order('criado_em', { ascending: false });
        if (errUser) throw errUser;

        // 2. Busca todas as malharias para sabermos os nomes
        const { data: malharias, error: errMal } = await supabase.schema('malharia')
            .from('malharia')
            .select('id, nome');
        if (errMal) throw errMal;

        // 3. Busca a tabela de vínculos (quem pode ver o quê)
        const { data: vinculos, error: errVinc } = await supabase.schema('malharia')
            .from('usuario_malharia')
            .select('usuario_id, malharia_id');
        if (errVinc) throw errVinc;

        // 4. Junta as informações: Adiciona os IDs das malharias dentro de cada usuário monitor
        const usuariosMapeados = usuarios.map(usuario => {
            if (usuario.cargo === 'monitor') {
                const vinculosDoUsuario = vinculos.filter(v => v.usuario_id === usuario.id);
                usuario.malharias_permitidas = vinculosDoUsuario.map(v => v.malharia_id);
            }
            return usuario;
        });

        // 5. Envia para a tela
        res.render('usuarios/index', { usuarios: usuariosMapeados, malharias });
    } catch (error) {
        console.error("Erro ao listar usuários:", error);
        res.redirect('/');
    }
};

exports.edit = async (req, res) => {
    const { id } = req.params;

    // Busca o usuário
    const { data: usuario } = await supabase.schema('malharia').from('usuarios').select('*').eq('id', id).single();
    
    // Busca todas as malharias para o Admin/Gestor poder vincular
    const { data: malharias } = await supabase.schema('malharia').from('malharia').select('id, nome');
    
    // Busca os vínculos atuais caso o usuário seja monitor
    const { data: vinculos } = await supabase.schema('malharia').from('usuario_malharia').select('malharia_id').eq('usuario_id', id);
    const malhariasVinculadas = vinculos ? vinculos.map(v => v.malharia_id) : [];

    res.render('usuarios/edit', { usuario, malharias, malhariasVinculadas });
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { cargo, status, malharias } = req.body; // malharias vem como array de IDs ou undefined
    
    // 1. Atualiza Cargo e Status do usuário
    await supabase.schema('malharia').from('usuarios')
        .update({ cargo, status }).eq('id', id);

    // 2. Se for monitor, gerencia os vínculos com as malharias
    if (cargo === 'monitor') {
        // Limpa vínculos antigos
        await supabase.schema('malharia').from('usuario_malharia').delete().eq('usuario_id', id);
        
        // Insere os novos vínculos se alguma malharia foi selecionada
        if (malharias) {
            const idsMalharias = Array.isArray(malharias) ? malharias : [malharias];
            const inserts = idsMalharias.map(m_id => ({ 
                usuario_id: id, 
                malharia_id: parseInt(m_id) 
            }));
            await supabase.schema('malharia').from('usuario_malharia').insert(inserts);
        }
    } else {
        // Se mudou de monitor para outro cargo, removemos os vínculos
        await supabase.schema('malharia').from('usuario_malharia').delete().eq('usuario_id', id);
    }

    res.redirect('/usuarios');
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    // Opcional: Impedir que o admin delete a si mesmo
    if (req.user.id === id) {
        return res.redirect('/usuarios');
    }
    await supabase.schema('malharia').from('usuarios').delete().eq('id', id);
    res.redirect('/usuarios');
};