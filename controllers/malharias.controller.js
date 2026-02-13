const malhariasService = require('../services/malharias.service');
const unidadesService = require('../services/unidades.service');
const maquinariosService = require('../services/maquinarios.service');

exports.index = async (req, res) => {
    try {
        const malharias = await malhariasService.getAllMalharias();
        res.render('malharias/index', { title: 'Gerenciar Malharias', malharias });
    } catch (error) {
        console.error(error);
        res.render('malharias/index', { title: 'Gerenciar Malharias', malharias: [], error: 'Erro ao listar.' });
    }
};

exports.create = async (req, res) => {
    try {
        const unidades = await unidadesService.getAllUnidades();
        let maquinarios = [];
        try {
            maquinarios = await maquinariosService.getAllMaquinas();
        } catch (e) {
            console.error("Aviso: Falha ao carregar maquinários:", e.message);
        }
        
        res.render('malharias/create', { 
            title: 'Nova Malharia',
            unidades: unidades || [],
            maquinarios: maquinarios || []
        });
    } catch (error) {
        console.error("Erro no Create:", error);
        res.send(`Erro ao abrir página: ${error.message}`);
    }
};

exports.store = async (req, res) => {
    try {
        const { nome, unidade_id, responsavel, num_internos, num_internos_remunerados, itensJSON } = req.body;
        
        // Validação Simples
        if (parseInt(num_internos_remunerados) > parseInt(num_internos)) {
            throw new Error("O número de internos remunerados não pode ser maior que o total de internos.");
        }

        let listaItens = [];
        if (itensJSON) listaItens = JSON.parse(itensJSON);

        await malhariasService.createMalharia({
            nome,
            unidade_id,
            responsavel,
            num_internos: parseInt(num_internos) || 0,
            num_internos_remunerados: parseInt(num_internos_remunerados) || 0
        }, listaItens);

        res.redirect('/malharias');
    } catch (error) {
        console.error(error);
        // Idealmente renderizaria a view create com o erro, mas para simplificar o redirect:
        res.redirect('/malharias/create'); 
    }
};

exports.edit = async (req, res) => {
    try {
        const { id } = req.params;
        let malharia = await malhariasService.getMalhariaById(id);
        if (!malharia) return res.status(404).send('Malharia não encontrada.');

        const unidades = await unidadesService.getAllUnidades();
        let maquinarios = [];
        try { maquinarios = await maquinariosService.getAllMaquinas(); } catch(e) {}

        res.render('malharias/edit', { title: 'Editar Malharia', malharia, unidades, maquinarios });

    } catch (error) {
        console.error('ERRO NO EDIT:', error);
        res.status(500).send(`Erro: ${error.message} <br><a href="/malharias">Voltar</a>`);
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, unidade_id, responsavel, num_internos, num_internos_remunerados, itensJSON } = req.body;

        if (parseInt(num_internos_remunerados) > parseInt(num_internos)) {
             // Em um cenário real, você passaria esse erro para a view
             console.error("Erro de validação: Remunerados > Total");
        }

        let listaItens = itensJSON ? JSON.parse(itensJSON) : [];

        await malhariasService.updateMalharia(id, {
            nome,
            unidade_id,
            responsavel,
            num_internos: parseInt(num_internos) || 0,
            num_internos_remunerados: parseInt(num_internos_remunerados) || 0
        }, listaItens);

        res.redirect('/malharias');
    } catch (error) {
        console.error(error);
        res.redirect(`/malharias/${req.params.id}/edit`);
    }
};

exports.destroy = async (req, res) => {
    try {
        await malhariasService.deleteMalharia(req.params.id);
        res.redirect('/malharias');
    } catch (error) {
        res.redirect('/malharias');
    }
};