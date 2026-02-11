const registrosService = require('../services/registros.service');
const processosService = require('../services/processos.service');
const malhariasService = require('../services/malharias.service');

exports.index = async (req, res) => {
    try {
        const registros = await registrosService.getAllRegistros();
        res.render('registros/index', { 
            title: 'Registro Diário de Produção', 
            registros 
        });
    } catch (error) {
        console.error(error);
        res.render('partials/alerts', { message: 'Erro ao carregar registros', type: 'danger' });
    }
};

exports.create = async (req, res) => {
    try {
        // Carrega dependências para os selects
        const processos = await processosService.getAllProcessos();
        const malharias = await malhariasService.getAllMalharias();
        
        res.render('registros/create', { 
            title: 'Novo Apontamento',
            processos,
            malharias
        });
    } catch (error) {
        console.error(error);
        res.redirect('/registros');
    }
};

exports.store = async (req, res) => {
    try {
        const { data_registro, processo_id, malharia_id, observacao } = req.body;
        
        await registrosService.createRegistro({
            data_registro: data_registro || new Date(),
            processo_id,
            malharia_id,
            observacao,
            criado_por: req.user.id
        });

        res.redirect('/registros');
    } catch (error) {
        console.error(error);
        // Em caso de erro real, idealmente recarregaríamos os selects para re-renderizar o form
        res.redirect('/registros/create?error=true'); 
    }
};

exports.destroy = async (req, res) => {
    try {
        const { id } = req.params;
        await registrosService.deleteRegistro(id);
        res.redirect('/registros');
    } catch (error) {
        console.error(error);
        res.redirect('/registros');
    }
};