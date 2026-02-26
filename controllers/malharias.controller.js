const malhariasService = require('../services/malharias.service');
const unidadesService = require('../services/unidades.service');
const maquinariosService = require('../services/maquinarios.service');

exports.index = async (req, res) => {
    try {
        let malharias = await malhariasService.getAllMalharias();

        // Filtra as malharias se o usuário for Monitor
        if (req.user.cargo === 'monitor') {
            const permitidas = req.user.malharias_permitidas || [];
            malharias = malharias.filter(m => permitidas.includes(m.id));
        }

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
        res.redirect('/malharias');
    }
};

exports.store = async (req, res) => {
    try {
        const { nome, unidade_id, responsavel, num_internos, num_internos_remunerados, itensJSON } = req.body;
        
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
        res.redirect('/malharias/create'); 
    }
};

exports.edit = async (req, res) => {
    try {
        const { id } = req.params;
        let malharia = await malhariasService.getMalhariaById(id);
        if (!malharia) return res.redirect('/malharias');

        const unidades = await unidadesService.getAllUnidades();
        let maquinarios = [];
        try { maquinarios = await maquinariosService.getAllMaquinas(); } catch(e) {}

        res.render('malharias/edit', { title: 'Editar Malharia', malharia, unidades, maquinarios });

    } catch (error) {
        console.error('ERRO NO EDIT:', error);
        res.redirect('/malharias');
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, unidade_id, responsavel, num_internos, num_internos_remunerados, itensJSON } = req.body;

        // Proteção à prova de falhas convertendo tudo para string
        if (req.user.cargo === 'monitor') {
            const permitidasStr = (req.user.malharias_permitidas || []).map(String);
            if (!permitidasStr.includes(String(id))) {
                return res.redirect('/malharias');
            }
        }

        let listaItens = itensJSON ? JSON.parse(itensJSON) : [];

        if (req.user.nivel < 3) {
            // Monitor/Coordenador apenas salva a lista de máquinas
            const malhariaAtual = await malhariasService.getMalhariaById(id);
            await malhariasService.updateMalharia(id, {
                nome: malhariaAtual.nome,
                unidade_id: malhariaAtual.unidade_id,
                responsavel: malhariaAtual.responsavel,
                num_internos: malhariaAtual.num_internos,
                num_internos_remunerados: malhariaAtual.num_internos_remunerados
            }, listaItens);
        } else {
            // Gestor/Admin salva tudo
            if (parseInt(num_internos_remunerados) > parseInt(num_internos)) console.error("Erro: Remunerados > Total");
            await malhariasService.updateMalharia(id, {
                nome, unidade_id, responsavel,
                num_internos: parseInt(num_internos) || 0,
                num_internos_remunerados: parseInt(num_internos_remunerados) || 0
            }, listaItens);
        }

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