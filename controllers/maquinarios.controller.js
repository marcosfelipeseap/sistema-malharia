const service = require('../services/maquinarios.service');

// --- PÁGINA PRINCIPAL (LISTA MÁQUINAS) ---
exports.index = async (req, res) => {
    try {
        const busca = req.query.busca || '';
        const maquinas = await service.getAllMaquinas(busca);

        // Se for uma requisição AJAX (fetch), retornamos apenas o JSON das máquinas
        // ou um HTML parcial. Aqui vou optar por retornar JSON para facilitar o front montar a tabela
        // ou podemos renderizar um partial. Vamos de JSON para ser moderno e rápido.
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ maquinas });
        }

        res.render('maquinarios/index', { title: 'Maquinários', maquinas, busca });
    } catch (error) {
        console.error(error);
        if (req.xhr) return res.status(500).json({ error: 'Erro ao buscar' });
        res.render('partials/alerts', { message: 'Erro ao carregar máquinas', type: 'danger' });
    }
};

// --- CRUD MÁQUINAS ---
exports.create = async (req, res) => {
    try {
        const tipos = await service.getAllTipos();
        res.render('maquinarios/create', { title: 'Nova Máquina', tipos, error: null, formData: {} });
    } catch (error) {
        res.redirect('/maquinarios');
    }
};

exports.store = async (req, res) => {
    try {
        await service.createMaquina({
            nome: req.body.nome,
            tipo_id: req.body.tipo_id || null
        });
        res.redirect('/maquinarios');
    } catch (error) {
        const tipos = await service.getAllTipos();
        res.render('maquinarios/create', { 
            title: 'Nova Máquina', 
            tipos, 
            error: 'Erro ao salvar: ' + error.message, 
            formData: req.body 
        });
    }
};

exports.edit = async (req, res) => {
    try {
        const maquina = await service.getMaquinaById(req.params.id);
        const tipos = await service.getAllTipos();
        res.render('maquinarios/edit', { title: 'Editar Máquina', maquina, tipos, error: null });
    } catch (error) {
        res.redirect('/maquinarios');
    }
};

exports.update = async (req, res) => {
    try {
        await service.updateMaquina(req.params.id, {
            nome: req.body.nome,
            tipo_id: req.body.tipo_id || null
        });
        res.redirect('/maquinarios');
    } catch (error) {
        res.redirect(`/maquinarios/${req.params.id}/edit`);
    }
};

exports.destroy = async (req, res) => {
    try {
        await service.deleteMaquina(req.params.id);
        res.redirect('/maquinarios');
    } catch (error) {
        res.redirect('/maquinarios');
    }
};

// --- GERENCIAMENTO DE TIPOS ---
exports.indexTipos = async (req, res) => {
    try {
        const tipos = await service.getAllTipos();
        res.render('maquinarios/tipos', { title: 'Gerenciar Tipos', tipos, error: null });
    } catch (error) {
        res.redirect('/maquinarios');
    }
};

exports.storeTipo = async (req, res) => {
    try {
        if (!req.body.nome) throw new Error("Nome é obrigatório");
        await service.createTipo(req.body.nome);
        res.redirect('/maquinarios/tipos');
    } catch (error) {
        const tipos = await service.getAllTipos();
        res.render('maquinarios/tipos', { title: 'Gerenciar Tipos', tipos, error: error.message });
    }
};

// [NOVO] Atualizar Tipo
exports.updateTipo = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome } = req.body;
        await service.updateTipo(id, nome);
        res.redirect('/maquinarios/tipos');
    } catch (error) {
        // Em caso de erro, apenas recarrega (pode adicionar flash message se tiver suporte configurado)
        console.error("Erro ao atualizar tipo:", error);
        res.redirect('/maquinarios/tipos');
    }
};

exports.destroyTipo = async (req, res) => {
    try {
        await service.deleteTipo(req.params.id);
        res.redirect('/maquinarios/tipos');
    } catch (error) {
        console.error(error); 
        res.redirect('/maquinarios/tipos');
    }
};