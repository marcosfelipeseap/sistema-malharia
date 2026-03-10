const supabase = require('../config/supabaseClient');
const bcrypt = require('bcryptjs');

// ==========================================
// ROTAS DO PERFIL (Para todos os logados)
// ==========================================

exports.getPerfil = async (req, res) => {
    try {
        // Busca os dados diretamente e frescos do banco de dados (trazendo o avatar completo)
        const { data: perfilDb, error } = await supabase.schema('malharia')
            .from('usuarios')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;

        // Passamos os dados com o nome "perfil" para a tela
        res.render('usuarios/perfil', { perfil: perfilDb, error: null, success: null });
    } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        res.render('usuarios/perfil', { perfil: req.user, error: 'Erro ao carregar os dados do banco.', success: null });
    }
};

exports.updatePerfil = async (req, res) => {
    try {
        // Puxa o perfil logo no início para usar em caso de erro nas validações
        const { data: perfilAtual } = await supabase.schema('malharia')
            .from('usuarios')
            .select('*')
            .eq('id', req.user.id)
            .single();

        const { nome, username, email, telefone, senha_atual, nova_senha, confirmar_senha, avatar } = req.body;
        const updates = { nome, username, email, telefone };

        // Lógica para salvar ou remover o avatar
        if (avatar) {
            if (avatar === 'remove') {
                updates.avatar = null;
            } else if (avatar.trim() !== '') {
                updates.avatar = avatar;
            }
        }

        // Lógica de alteração de senha
        if (nova_senha && nova_senha.trim() !== '') {
            if (nova_senha !== confirmar_senha) {
                return res.render('usuarios/perfil', { perfil: perfilAtual, error: 'A nova senha e a confirmação não coincidem.', success: null });
            }
            if (!senha_atual) {
                return res.render('usuarios/perfil', { perfil: perfilAtual, error: 'Para alterar a senha, deve informar a sua senha atual.', success: null });
            }
            const validPassword = await bcrypt.compare(senha_atual, perfilAtual.senha);
            if (!validPassword) {
                return res.render('usuarios/perfil', { perfil: perfilAtual, error: 'A senha atual informada está incorreta.', success: null });
            }

            const salt = await bcrypt.genSalt(10);
            updates.senha = await bcrypt.hash(nova_senha, salt);
        }

        // Atualiza os dados no banco
        const { error } = await supabase.schema('malharia')
            .from('usuarios')
            .update(updates)
            .eq('id', req.user.id);

        if (error) throw error;

        // Atualiza as sessões básicas da Navbar (nome e user)
        req.user.nome = nome;
        req.user.username = username;
        // Não colocamos a foto no req.user para não exceder os limites do Cookie

        // Busca o perfil atualizado para exibir na tela o resultado final
        const { data: perfilNovo } = await supabase.schema('malharia')
            .from('usuarios')
            .select('*')
            .eq('id', req.user.id)
            .single();

        res.render('usuarios/perfil', { perfil: perfilNovo, error: null, success: 'Perfil atualizado com sucesso!' });
    } catch (err) {
        console.error(err);
        res.render('usuarios/perfil', { perfil: req.user, error: 'Erro ao atualizar o perfil. A foto pode ser muito grande.', success: null });
    }
};

// ==========================================
// ROTAS DE GESTÃO (Apenas Gestor e Admin)
// ==========================================

exports.index = async (req, res) => {
    try {
        const { data: usuarios, error: errUser } = await supabase.schema('malharia')
            .from('usuarios')
            .select('*')
            .order('criado_em', { ascending: false });
        if (errUser) throw errUser;

        const { data: malharias, error: errMal } = await supabase.schema('malharia')
            .from('malharia')
            .select('id, nome');
        if (errMal) throw errMal;

        const { data: vinculos, error: errVinc } = await supabase.schema('malharia')
            .from('usuario_malharia')
            .select('usuario_id, malharia_id');
        if (errVinc) throw errVinc;

        const usuariosMapeados = usuarios.map(usuario => {
            if (usuario.cargo === 'monitor') {
                const vinculosDoUsuario = vinculos.filter(v => v.usuario_id === usuario.id);
                usuario.malharias_permitidas = vinculosDoUsuario.map(v => v.malharia_id);
            }
            return usuario;
        });

        res.render('usuarios/index', { usuarios: usuariosMapeados, malharias });
    } catch (error) {
        console.error("Erro ao listar usuários:", error);
        res.redirect('/');
    }
};

exports.edit = async (req, res) => {
    const { id } = req.params;
    const { data: usuario } = await supabase.schema('malharia').from('usuarios').select('*').eq('id', id).single();
    const { data: malharias } = await supabase.schema('malharia').from('malharia').select('id, nome');
    const { data: vinculos } = await supabase.schema('malharia').from('usuario_malharia').select('malharia_id').eq('usuario_id', id);
    const malhariasVinculadas = vinculos ? vinculos.map(v => v.malharia_id) : [];

    res.render('usuarios/edit', { usuario, malharias, malhariasVinculadas });
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { cargo, status, malharias } = req.body; 
    
    await supabase.schema('malharia').from('usuarios').update({ cargo, status }).eq('id', id);

    if (cargo === 'monitor') {
        await supabase.schema('malharia').from('usuario_malharia').delete().eq('usuario_id', id);
        if (malharias) {
            const idsMalharias = Array.isArray(malharias) ? malharias : [malharias];
            const inserts = idsMalharias.map(m_id => ({ usuario_id: id, malharia_id: parseInt(m_id) }));
            await supabase.schema('malharia').from('usuario_malharia').insert(inserts);
        }
    } else {
        await supabase.schema('malharia').from('usuario_malharia').delete().eq('usuario_id', id);
    }
    res.redirect('/usuarios');
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    if (req.user.id === id) {
        return res.redirect('/usuarios');
    }
    await supabase.schema('malharia').from('usuarios').delete().eq('id', id);
    res.redirect('/usuarios');
};