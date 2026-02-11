const malhariasService = require('../services/malharias.service');
const unidadesService = require('../services/unidades.service');

exports.index = async (req, res) => {
    try {
        const malharias = await malhariasService.getAllMalharias();
        res.render('malharias/index', { 
            title: 'Gestão de Malharias', 
            malharias 
        });
    } catch (error) {
        console.error(error);
        res.render('partials/alerts', { message: 'Erro ao listar malharias', type: 'danger' });
    }
};

exports.create = async (req, res) => {
    try {
        // Precisamos das unidades para o select box
        const unidades = await unidadesService.getAllUnidades();
        res.render('malharias/create', { 
            title: 'Nova Malharia', 
            unidades 
        });
    } catch (error) {
        console.error(error);
        res.redirect('/malharias');
    }
};

exports.store = async (req, res) => {
    try {
        const { nome, tipo, capacidade_mensal, unidade_id } = req.body;
        
        await malhariasService.createMalharia({
            nome,
            tipo, // Ex: Fiação, Tecelagem, Tinturaria
            capacidade_mensal,
            unidade_id // FK para tabela unidade
        });

        res.redirect('/malharias');
    } catch (error) {
        console.error(error);
        const unidades = await unidadesService.getAllUnidades(); // Recarrega em caso de erro
        res.render('malharias/create', { 
            title: 'Nova Malharia', 
            unidades,
            error: 'Erro ao cadastrar malharia' 
        });
    }
};

exports.edit = async (req, res) => {
    try {
        const { id } = req.params;
        const malharia = await malhariasService.getMalhariaById(id);
        const unidades = await unidadesService.getAllUnidades();
        
        if (!malharia) return res.redirect('/malharias');

        res.render('malharias/edit', { title: 'Editar Malharia', malharia, unidades });
    } catch (error) {
        console.error(error);
        res.redirect('/malharias');
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, tipo, capacidade_mensal, unidade_id } = req.body;

        await malhariasService.updateMalharia(id, {
            nome,
            tipo,
            capacidade_mensal,
            unidade_id
        });

        res.redirect('/malharias');
    } catch (error) {
        console.error(error);
        res.redirect(`/malharias/${req.params.id}/edit`);
    }
};

exports.destroy = async (req, res) => {
    try {
        const { id } = req.params;
        await malhariasService.deleteMalharia(id);
        res.redirect('/malharias');
    } catch (error) {
        console.error(error);
        res.redirect('/malharias');
    }
};