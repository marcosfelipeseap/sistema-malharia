const unidadesService = require('../services/unidades.service');

exports.index = async (req, res) => {
    try {
        const unidades = await unidadesService.getAllUnidades();
        res.render('unidades/index', { 
            title: 'Gerenciar Unidades', 
            unidades 
        });
    } catch (error) {
        console.error(error);
        res.render('partials/alerts', { message: 'Erro ao listar unidades', type: 'danger' });
    }
};

exports.create = (req, res) => {
    res.render('unidades/create', { title: 'Nova Unidade' });
};

exports.store = async (req, res) => {
    try {
        const { nome, endereco, cidade, telefone } = req.body;
        
        await unidadesService.createUnidade({
            nome,
            endereco,
            cidade,
            telefone
        });

        res.redirect('/unidades');
    } catch (error) {
        console.error(error);
        res.render('unidades/create', { 
            title: 'Nova Unidade', 
            error: 'Erro ao cadastrar unidade' 
        });
    }
};

exports.edit = async (req, res) => {
    try {
        const { id } = req.params;
        const unidade = await unidadesService.getUnidadeById(id);
        
        if (!unidade) return res.redirect('/unidades');

        res.render('unidades/edit', { title: 'Editar Unidade', unidade });
    } catch (error) {
        console.error(error);
        res.redirect('/unidades');
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, endereco, cidade, telefone } = req.body;

        await unidadesService.updateUnidade(id, {
            nome,
            endereco,
            cidade,
            telefone
        });

        res.redirect('/unidades');
    } catch (error) {
        console.error(error);
        res.redirect(`/unidades/${req.params.id}/edit`);
    }
};

exports.destroy = async (req, res) => {
    try {
        const { id } = req.params;
        await unidadesService.deleteUnidade(id);
        res.redirect('/unidades');
    } catch (error) {
        console.error(error);
        res.redirect('/unidades');
    }
};